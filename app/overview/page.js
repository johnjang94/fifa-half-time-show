import Image from "next/image";
import Link from "next/link";
import heroImage from "../../image.png";
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
        <header className="overview-copy">
          <p className="overview-eyebrow">swipe through the vibe</p>
          <h1>Step into the experience</h1>
          <p className="overview-lede">
            Slide sideways to move through the party moments, one mood at a time.
          </p>
        </header>

        <section className="overview-carousel" aria-label="Overview cards">
          <div className="overview-track">
            {cards.map((card, index) => (
              <article className="overview-card" key={card.title}>
                <div className="overview-media">
                  <Image
                    alt={card.alt}
                    className="overview-image"
                    fill
                    priority={index === 0}
                    sizes="(max-width: 640px) 84vw, 420px"
                    src={card.src}
                  />
                  <span className="overview-label">{card.title}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="overview-progress" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <Link className="signup-button" href="/register">
          sign up
        </Link>
      </section>
    </main>
  );
}
