import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Component, OnDestroy, Injectable, Directive, Input, HostListener } from '@angular/core';

import { AppComponent } from './app.component';
import { Event, RouterLinkWithHref, RouterModule, Resolve, Router, NavigationStart, NavigationEnd, RouterLink, Routes, NavigationExtras, UrlTree, ActivatedRoute } from '@angular/router';
import { timer, of, Subscription, Subject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { LocationStrategy } from '@angular/common';

@Component({
  template: `aaa`
})
export class AComponent {}

@Component({
  template: `bbb`
})
export class BComponent {}

@Component({
  template: `ccc`
})
export class CComponent {}

/**
 * This is not going to block navigations in Angular 7.
 * 
 * Angular 7 uses switchMap instead of concatMap to process the navigations/transitions observable. 
 * This  means the moment the new navigation arrives, the old one will be thrown away. All the observables
 * will be unsubscribed.
 * 
 * With this, it's even more important you only use `tap` to execute side effects and don't run those
 * in setTimeout or a promise.
 * 
 * If you use `tap`, you should not have any race conditions.
 */
export class SlowResolver implements Resolve<any> {
  resolve() {
    console.log('start resolving');
    return timer(5000).pipe(map(() => true), tap(() => {
      console.log('resolved');
    }));
  }
}

interface NavigationExtrasWithActivity extends NavigationExtras {
  /**
   * The source of the navigation.
   */
  source: string;
} 

/**
 * In practice this has the same interface as Router, but we cannot implement Router because Router 
 * has private fields.
 */
@Injectable()
class RouterWithActivityTracking {
  private source: string;
  private eventsSubscription: Subscription;
  private informationAboutNavigations: {[id: number]: any} = {};
  activity = new Subject<any>();

  constructor(private router: Router) {
    this.eventsSubscription = router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        this.informationAboutNavigations[e.id] = {
          source: this.source,
          fromUrl: e.url,
          navigationTrigger: e.navigationTrigger
        };
        this.source = null; 
      }
      /**
       * we are handling NavigationEnd, but we should also handle NavigationCancel and NavigationError.
       */
      if (e instanceof NavigationEnd) {
        const i = this.informationAboutNavigations[e.id];
        this.activity.next({
          id: e.id,
          fromUrl: i.fromUrl,
          toUrl: e.url,
          source: i.source,
          navigationTrigger: i.navigationTrigger
        });
        delete this.informationAboutNavigations[e.id];
      }
    });
  }

  initialNavigation(): void {
    this.router.initialNavigation();
  }

  setUpLocationChangeListener() {
    this.router.setUpLocationChangeListener();
  }

  get events(): Observable<Event> {
    return this.router.events;
  }

  get url(): string {
    return this.router.url;
  }

  resetConfig(config: Routes): void {
    this.router.resetConfig(config);
  }
  
  dispose(): void {
    this.router.dispose();
  }

  createUrlTree(commands: any[], navigationExtras?: NavigationExtrasWithActivity): UrlTree {
    return this.router.createUrlTree(commands, navigationExtras);
  }
  
  navigateByUrl(url: string | UrlTree, extras?: NavigationExtrasWithActivity): Promise<boolean> {
    /**
     * We are storing the source here, and will access it in the constructor.
     * This only works because NavigationStart is fired synchronously.
     */
    this.source = extras.source;
    return this.router.navigateByUrl(url, extras);
  }
  
  navigate(commands: any[], extras?: NavigationExtrasWithActivity): Promise<boolean> {
    this.source = extras.source;
    return this.router.navigate(commands, extras);
  }

  serializeUrl(url: UrlTree): string {
    return this.router.serializeUrl(url);
  }
  
  parseUrl(url: string): UrlTree {
    return this.router.parseUrl(url);
  }

  isActive(url: string | UrlTree, exact: boolean): boolean {
    return this.router.isActive(url, exact);
  }
}

/**
 * We are creating a separate router link directive that has the source field we are passing to the router.
 * The rest of this directive will work exactly the same way as the built-in router link.
 * 
 * Note: currently we force the user to provision source, but you could always make this behavior custom.
 * For instance, you could annotate sources in the dom and inject them here. In which case,
 * RouterLinkWithActivityTracking would find the closest source in the dom.
 */
@Directive({selector: 'a[rlink]'})
export class RouterLinkWithActivityTracking extends RouterLinkWithHref {
  @Input() source: string;

  constructor(private routerWithActivity: RouterWithActivityTracking, route: ActivatedRoute, locationStrategy: LocationStrategy) {
    super(routerWithActivity as any, route, locationStrategy);
  }

  @Input()
  set rlink(v: string) {
    this.routerLink = v;
  }

  @HostListener('click', ['$event.button', '$event.ctrlKey', '$event.metaKey', '$event.shiftKey'])
  onClick(button: number, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean): boolean {
    console.log('navigation is happening');
    if (button !== 0 || ctrlKey || metaKey || shiftKey) {
      return true;
    }
    if (typeof this.target === 'string' && this.target != '_self') {
      return true;
    }
    const extras = {
      skipLocationChange: attrBoolValue(this.skipLocationChange),
      replaceUrl: attrBoolValue(this.replaceUrl),
      source: this.source
    };
    this.routerWithActivity.navigateByUrl(this.urlTree, extras);
    return false;
  }
}

function attrBoolValue(s: any): boolean {
  return s === '' || !!s;
}


@NgModule({
  declarations: [
    AppComponent,
    AComponent,
    BComponent,
    CComponent,
    RouterLinkWithActivityTracking
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      {
        path: 'aaa',
        component: AComponent
      },
      {
        path: 'bbb',
        component: BComponent,
        resolve: {
          data: SlowResolver
        }
      },
      {
        path: 'ccc',
        component: CComponent
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: '/aaa'
      }
    ])
  ],
  providers: [SlowResolver, RouterWithActivityTracking],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(router: RouterWithActivityTracking) {
    router.activity.subscribe(e => {
      console.log('routerActivity', e);
    });
  }
}
