import Image from "next/image";
import Link from "next/link";
import fifaImage from "../../image.png";
import patioImage from "../../patio.webp";

const cards = [
  {
    title: "watch soccer",
    src: fifaImage,
    alt: "FIFA 2026 soccer scene",
  },
  {
    title: "enjoy food",
    src: fifaImage,
    alt: "BBQ food scene",
  },
  {
    title: "watch BTS",
    src: fifaImage,
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
    <main className="overview-page">
      <section className="overview-shell">
        <section className="overview-grid" aria-label="Overview cards">
          {cards.map((card, index) => (
            <article className={`overview-card overview-card-${index + 1}`} key={card.title}>
              <div className="overview-media">
                <Image
                  alt={card.alt}
                  className="overview-image"
                  fill
                  priority={index === 0}
                  sizes="(max-width: 900px) 100vw, 50vw"
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
