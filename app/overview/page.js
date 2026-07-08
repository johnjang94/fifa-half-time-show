import Image from "next/image";
import Link from "next/link";
import bbqImage from "../../bbq.jpeg";
import dreamersImage from "../../dreamers.gif";
import englandImage from "../../england.gif";
import patioImage from "../../patio.webp";

const cards = [
  {
    title: "watch soccer",
    src: englandImage,
    alt: "England soccer scene",
  },
  {
    title: "enjoy food",
    src: bbqImage,
    alt: "BBQ food scene",
  },
  {
    title: "watch BTS",
    src: dreamersImage,
    alt: "BTS concert scene",
  },
  {
    title: "at the patio",
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
      <section className="overview-shell">
        <section className="overview-grid" aria-label="Overview cards">
          {cards.map((card, index) => (
            <article className="overview-card" key={card.title}>
              <div className="overview-media">
                <Image
                  alt={card.alt}
                  className="overview-image"
                  fill
                  priority={index === 0}
                  sizes="(max-width: 640px) 100vw, 50vw"
                  src={card.src}
                />
                <span className="overview-label">{card.title}</span>
              </div>
            </article>
          ))}
        </section>

        <Link className="signup-button" href="/">
          sign up
        </Link>
      </section>
    </main>
  );
}
