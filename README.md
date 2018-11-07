# Activity Tracking and Navigation Cancelation

## Navigation Cancelation

Open `app.module.ts` and find `SlowResolver`. The resolver is used when clicking on "bbb". In Angular 6, if you click on "bbb" and then on "ccc", it would wait for the resolver to complete. In Angular 7 it won't. The implementation of the router has changed from `concatMap` to `switchMap`. So you won't have to do anything in regards to cancelation if you use Angular 7. In Angular 6, you would have to do something like this:

```
export class SlowResolver implements CancelableResolve<any> {
  cancelableResolve() {
    console.log('start resolving');
    return timer(5000).pipe(map(() => true), tap(() => {
      console.log('resolved');
    }));
  }
}
```


## Activity Tracking

There are many ways to implement activity tracking. This repo shows how to do in a declarative way.

1. The repo defines `RouterWithActivityTracking`. It's the same as the built-in router, except its `navigate` and `navigateByUrl` take an extra param--`source`.
2. The repo defines `RouterLinkWithActivityTracking`. It's the same as the built-in directive, except it takes an extra input--`source`.`

