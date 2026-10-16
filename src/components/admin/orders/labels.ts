export function prettyStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function areaLabel(area: string): string {
  return area === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka";
}
