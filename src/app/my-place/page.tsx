import type { Metadata } from "next";
import { MyPlace } from "./my-place";

// Reads on-device storage (saved place, answers), so it renders in the browser only.
export const instant = false;

export const metadata: Metadata = { title: "My places" };

export default function MyPlacePage() {
  return <MyPlace />;
}
