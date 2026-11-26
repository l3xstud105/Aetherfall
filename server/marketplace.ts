// AETHERFALL 1.0.0 — Authoritative Player Marketplace / Auction House
import { DB, MarketListing } from './db';
import { ServerPlayer, WorldSimulation } from './world';

export class MarketplaceManager {
  private db: DB;
  private world: WorldSimulation;

  constructor(db: DB, world: WorldSimulation) {
    this.db = db;
    this.world = world;
  }

  handleBrowse(player: ServerPlayer, search?: string) {
    const listings = this.db.getActiveMarketListings(search, 50);
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({
        t: 'market_listings',
        listings
      }));
    }
  }

  handleMyListings(player: ServerPlayer) {
    const listings = this.db.getMyMarketListings(player.char.id);
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({
        t: 'market_my_listings',
        listings
      }));
    }
  }

  handleCreateListing(player: ServerPlayer, itemId: string, qty: number, price: number) {
    try {
      const listing = this.db.createMarketListing(player.char.id, player.char.name, itemId, qty, price);
      player.char.inventory = this.db.getInventory(player.char.id);

      if (player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({
          t: 'market_listed',
          listing
        }));
        player.ws.send(JSON.stringify({
          t: 'inv_update',
          inventory: player.char.inventory,
          gold: player.char.gold
        }));
      }

      // Broadcast new active listing notification
      this.world.broadcastAll({
        t: 'chat_msg',
        channel: 'world',
        from: 'Marketplace',
        text: `📦 [Market] ${player.char.name} listed ${qty}x ${itemId} for ${price} gold.`
      });
    } catch (err: any) {
      if (player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({ t: 'market_err', error: err.message }));
      }
    }
  }

  handleBuyListing(player: ServerPlayer, listingId: string) {
    try {
      const result = this.db.buyMarketListing(player.char.id, player.char.name, listingId);
      player.char.gold = result.buyerGold;
      player.char.inventory = this.db.getInventory(player.char.id);

      if (player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({
          t: 'market_bought',
          listing: result.listing
        }));
        player.ws.send(JSON.stringify({
          t: 'inv_update',
          inventory: player.char.inventory,
          gold: player.char.gold
        }));
      }

      // Notify seller if online
      const seller = this.world.players.get(result.listing.seller_id);
      if (seller) {
        seller.char.gold = result.sellerGold;
        if (seller.ws.readyState === 1) {
          seller.ws.send(JSON.stringify({
            t: 'inv_update',
            gold: seller.char.gold,
            inventory: seller.char.inventory
          }));
          seller.ws.send(JSON.stringify({
            t: 'chat_msg',
            channel: 'system',
            from: 'Marketplace',
            text: `💰 Your listing for ${result.listing.qty}x ${result.listing.item_id} was purchased by ${player.char.name} for ${result.listing.price} gold!`
          }));
        }
      }
    } catch (err: any) {
      if (player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({ t: 'market_err', error: err.message }));
      }
    }
  }

  handleCancelListing(player: ServerPlayer, listingId: string) {
    try {
      const listing = this.db.cancelMarketListing(player.char.id, listingId);
      player.char.inventory = this.db.getInventory(player.char.id);

      if (player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({
          t: 'market_cancelled',
          listing
        }));
        player.ws.send(JSON.stringify({
          t: 'inv_update',
          inventory: player.char.inventory,
          gold: player.char.gold
        }));
      }
    } catch (err: any) {
      if (player.ws.readyState === 1) {
        player.ws.send(JSON.stringify({ t: 'market_err', error: err.message }));
      }
    }
  }
}
