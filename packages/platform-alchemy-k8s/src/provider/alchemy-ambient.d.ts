declare module "alchemy" {
  export interface AlchemyLifecycleContext<Out> {
    readonly phase: "create" | "update" | "delete"
    create(props: Out): Out
    destroy(retainChildren?: boolean): never
  }

  export function Resource<Props, Out>(
    type: string,
    handler: (this: AlchemyLifecycleContext<Out>, id: string, props: Props) => Promise<Out>,
  ): (id: string, props: Props) => Promise<Out>
}
