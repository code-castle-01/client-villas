import {
  lazy,
  type ComponentType,
  type LazyExoticComponent,
} from "react";

export const lazyNamed = <
  TModule extends Record<string, unknown>,
  TKey extends keyof TModule,
>(
  loader: () => Promise<TModule>,
  exportName: TKey,
): LazyExoticComponent<ComponentType<any>> =>
  lazy(async () => {
    const module = await loader();
    return {
      default: module[exportName] as ComponentType<any>,
    };
  });
