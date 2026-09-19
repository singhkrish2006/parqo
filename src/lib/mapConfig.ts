export type TileLayerConfig = { url: string; attribution?: string };

// Set NEXT_PUBLIC_MAP_TILE_URL to a provider you have a plan/licence with
// (MapTiler, Stadia Maps, Mapbox, self-hosted ...). Example:
//   https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=YOUR_KEY
// and NEXT_PUBLIC_MAP_TILE_ATTRIBUTION with the credit text the provider requires.
const customTileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;

/** The zero-config fallback is fine for development, but Esri's free tiles
 * are not licensed for a commercial launch — configure a provider first. */
export const usingDefaultTiles = !customTileUrl;

export const TILE_LAYERS: TileLayerConfig[] = customTileUrl
  ? [
      {
        url: customTileUrl,
        attribution: process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ?? "",
      },
    ]
  : [
      {
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        attribution:
          "Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS community",
      },
      {
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      },
    ];
