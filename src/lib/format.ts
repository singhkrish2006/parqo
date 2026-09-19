export function priceLabel(pricePerHour: number): string {
  return pricePerHour === 0 ? "Free" : `₹${pricePerHour}/hr`;
}

export function directionsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
