export class Catalog<TData extends { id: string, name: string }> {
  readonly wildcard: TData | null = null
  private readonly items = new Map<string, TData>()

  constructor(source: TData[] | Catalog<TData> = [], wildcard: TData | null = null) {
    this.wildcard = wildcard

    if (source instanceof Catalog) {
      this.items = new Map(source.items.entries())
    } else {
      this.items = new Map(source.flatMap((item) => {
        return [
          [item.name, item],
          [item.id, item],
        ]
      }))
    }
  }

  public get size() {
    return this.items.size
  }

  public values() {
    return this.items.values()
  }

  public ids() {
    return new Set(this.values().map((item) => item.id))
  }

  public names() {
    return new Set(this.values().map((item) => item.name))
  }

  public add(item: TData): TData {
    if (!this.has(item.id)) {
      this.items.set(item.id, item)
      this.items.set(item.name, item)
    }

    return this.get(item.id)!
  }

  public has(item: TData | string): boolean {
    return !!this.get(item)
  }

  public get(item: TData | string): TData | undefined {
    if (typeof item !== "string") {
      return this.items.get(item.name)
    } else {
      return this.items.get(item)
    }
  }

  public isWildcard(item: TData | string): boolean {
    if (!this.wildcard) return false
    return this.wildcard.id === this.get(item)?.id
  }

  public equal(left: TData | string | undefined, right: TData | string | undefined) {
    if (!left || !right) return false

    const leftItem = this.get(left)
    if (!leftItem) return false

    const rightItem = this.get(right)
    if (!rightItem) return false

    return (
      this.isWildcard(leftItem)
      || this.isWildcard(rightItem)
      || leftItem.id === rightItem.id
    )
  }
}
