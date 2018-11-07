import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Component } from '@angular/core';

import { AppComponent } from './app.component';
import { RouterModule, Resolve } from '@angular/router';
import { timer } from 'rxjs';
import { map, tap } from 'rxjs/operators';

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


export class SlowResolver implements Resolve<any> {
  resolve() {
    console.log('start resolving');
    return timer(5000).pipe(map(() => true), tap(() => {
      console.log('resolved');
    }));
  }
}

@NgModule({
  declarations: [
    AppComponent,
    AComponent,
    BComponent,
    CComponent
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
  providers: [SlowResolver],
  bootstrap: [AppComponent]
})
export class AppModule { }
