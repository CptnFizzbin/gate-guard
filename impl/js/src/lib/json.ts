export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonArray
  | JsonObject

export type JsonArray = JsonValue[]

export type JsonObject = {
  [key: string | number]: JsonValue
}
