import { GiftCatalog, type GiftAction } from "./GiftCatalog.js";

export class GiftRouter {
  constructor(private readonly catalog: GiftCatalog) {}

  route(giftName: string): GiftAction | null {
    return this.catalog.lookupGift(giftName);
  }
}
