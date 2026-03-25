import { Component, inject, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ListeningService } from '../../services/listening.service';
import { Video } from '../../models/video.model';
import { VideoCardSkeletonComponent } from '../../components/skeletons/video-card-skeleton/video-card-skeleton';
import { AppButtonComponent } from '../../components/app-button/app-button';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, VideoCardSkeletonComponent, AppButtonComponent],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Catalog implements OnInit, AfterViewInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private seoService = inject(SeoService);
  private listeningService = inject(ListeningService);
  
  @ViewChildren('swiperContainer') swiperContainers!: QueryList<ElementRef>;

  // Configuración base de Swiper
  swiperConfig: any = {
    pagination: {
      clickable: true,
    },
  };

  videos = this.listeningService.videos;
  groupedVideos = computed(() => {
    const currentVideos = this.videos();
    const groups: { [key: string]: Video[] } = {};
    const isOverview = this.selectedFormat() === 'Todos';
    
    currentVideos.forEach(video => {
      const format = video.media_format || 'Otros';
      if (!groups[format]) {
        groups[format] = [];
      }
      groups[format].push(video);
    });
    
    return Object.entries(groups).map(([name, items]) => {
      // Si estamos en vista general, solo mostramos los últimos 20 de cada categoría
      const displayItems = isOverview ? items.slice(0, 20) : items;
      return { name, items: displayItems };
    });
  });

  isLoading = signal(true);
  error = signal<string | null>(null);

  // Filtros y Paginación
  searchQuery = signal<string>('');
  selectedFormat = signal<string>('Todos');
  selectedDifficulty = signal<number>(0); // 0 = Todos

  // Estados de expansión por mobile
  isCategoriesExpanded = signal(false);
  isDifficultyExpanded = signal(false);
  
  private readonly PAGE_SIZE = 12;
  private currentPage = 0;
  hasMore = signal(false);
  private searchTimeout: any;

  ngOnInit() {
    this.route.queryParams.subscribe((params: any) => {
      this.searchQuery.set(params['search'] || '');
      this.selectedFormat.set(params['format'] || 'Todos');
      this.loadVideos(true);
    });
  }

  ngAfterViewInit() {
    // Escuchar cuando se añaden nuevos carruseles al DOM (dinámicos)
    this.swiperContainers.changes.subscribe(() => {
      this.initSwipers();
    });
    
    // Intento inicial
    this.initSwipers();
  }

  private initSwipers() {
    // Pequeño delay para asegurar que el elemento está listo en el DOM
    setTimeout(() => {
      this.swiperContainers.forEach((container) => {
        const swiperEl = container.nativeElement;
        // Solo inicializar si no se ha hecho ya
        if (!swiperEl.initialized) {
          
          Object.assign(swiperEl, this.swiperConfig);
          swiperEl.initialize();
          
          // Lógica manual para ocultar/mostrar botones
          const wrapper = swiperEl.closest('.carousel-wrapper');
          const prevBtn = wrapper?.querySelector('.custom-swiper-button.prev') as HTMLElement;
          const nextBtn = wrapper?.querySelector('.custom-swiper-button.next') as HTMLElement;

          // Evaluación inicial
          setTimeout(() => {
             if (swiperEl.swiper && swiperEl.swiper.isLocked) {
                 if (prevBtn) prevBtn.style.display = 'none';
                 if (nextBtn) nextBtn.style.display = 'none';
             } else {
                 if (prevBtn) prevBtn.style.display = 'none';
                 if (nextBtn) nextBtn.style.display = 'flex';
             }
          }, 50);
          
          swiperEl.addEventListener('swiperprogress', (e: any) => {
            const [swiper, progress] = e.detail;
            
            if (swiper.isLocked) {
              if (prevBtn) prevBtn.style.display = 'none';
              if (nextBtn) nextBtn.style.display = 'none';
              return;
            }

            if (prevBtn) prevBtn.style.display = progress <= 0 ? 'none' : 'flex';
            if (nextBtn) nextBtn.style.display = progress >= 1 ? 'none' : 'flex';
          });
        }
      });
    }, 100);
  }

  slidePrev(event: Event) {
    event.stopPropagation();
    const swiperEl = (event.currentTarget as HTMLElement).closest('.carousel-wrapper')?.querySelector('swiper-container') as any;
    swiperEl?.swiper?.slidePrev();
  }

  slideNext(event: Event) {
    event.stopPropagation();
    const swiperEl = (event.currentTarget as HTMLElement).closest('.carousel-wrapper')?.querySelector('swiper-container') as any;
    swiperEl?.swiper?.slideNext();
  }

  async loadVideos(reset: boolean = false) {
    try {
      // Optimización Caché Estilo SWR (Solo cargamos si no hay datos o si es un reset)
      const hasData = this.videos().length > 0;
      const isInitialLoad = reset && !hasData;
      const isFiltering = this.searchQuery() !== '' || this.selectedFormat() !== 'Todos' || this.selectedDifficulty() !== 0;

      if (reset) {
        this.currentPage = 0;
        // Solo mostramos el skeleton si es la primera carga real y no hay caché
        if (!hasData || isFiltering) {
          this.isLoading.set(true);
        }
      }
      
      // Si ya tenemos datos y no estamos filtrando ni forzando reset, salimos
      if (hasData && reset && !isFiltering && this.listeningService.hasLoadedCatalog()) {
        return;
      }

      this.error.set(null);

      const isOverview = this.selectedFormat() === 'Todos';
      const limit = isOverview && reset ? 60 : this.PAGE_SIZE;
      const offset = this.currentPage * this.PAGE_SIZE;

      const { data, count } = await this.supabaseService.getVideos({
        onlyActive: true,
        searchQuery: this.searchQuery(),
        mediaFormat: this.selectedFormat(),
        difficulty: this.selectedDifficulty(),
        limit: limit,
        offset: offset
      });

      const items = data as Video[];

      if (reset) {
        this.videos.set(items);
        // Marcamos que el catálogo ya se cargó al menos una vez
        if (!isFiltering) {
          this.listeningService.hasLoadedCatalog.set(true);
        }
      } else {
        this.videos.update(curr => [...curr, ...items]);
      }

      this.hasMore.set(count !== null && this.videos().length < count);
    } catch (err: any) {
      this.error.set(err.message || 'Error cargando videos');
      console.error('Error loading videos', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadVideos(true);
    }, 400);
  }

  setFormatFilter(format: string) {
    this.selectedFormat.set(format);
    this.loadVideos(true);
  }

  setDifficultyFilter(diff: number) {
    this.selectedDifficulty.set(diff);
    this.loadVideos(true);
  }

  loadMore() {
    if (!this.hasMore() || this.isLoading()) return;
    this.currentPage++;
    this.loadVideos(false);
  }

  goToVideo(slug: string) {
    this.router.navigate(['/play', slug]);
  }

}
