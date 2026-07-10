import Image from "next/image";
import heroImage from "../../image.png";
import bbqImage from "../../bbq.jpeg";
import btsImage from "../../bts.gif";
import englandImage from "../../england.gif";
import patioImage from "../../patio.webp";
import { OverviewCarousel } from "./overview-carousel";

const cards = [
  {
    title: "watch soccer",
    caption: "watch final",
    arrows: { left: false, right: true },
    src: englandImage,
    alt: "England soccer scene",
  },
  {
    title: "enjoy food",
    caption: "eat food",
    arrows: { left: true, right: true },
    src: bbqImage,
    alt: "BBQ food scene",
  },
  {
    title: "watch BTS",
    caption: "watch bts",
    arrows: { left: true, right: true },
    src: btsImage,
    alt: "BTS concert scene",
  },
  {
    title: "at the patio",
    caption: "at the patio",
    arrows: { left: true, right: false },
    src: patioImage,
    alt: "Patio scene",
  },
];

export const metadata = {
  title: "Overview | FIFA Half-Time Show Party",
};

export default function OverviewPage() {
  return (
    <main className="app-frame overview-page">
      <div className="page-background" aria-hidden="true">
        <Image
          alt=""
          className="page-background-image"
          fill
          priority
          sizes="440px"
          src={heroImage}
        />
        <div className="page-background-overlay" />
      </div>
      <section className="overview-shell">
        <OverviewCarousel cards={cards} />
      </section>
    </main>
  );
}
