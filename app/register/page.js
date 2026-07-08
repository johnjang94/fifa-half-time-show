import Image from "next/image";
import Link from "next/link";
import heroImage from "../../image.png";

export const metadata = {
  title: "Register | FIFA X BTS Watch Party",
};

export default function RegisterPage() {
  return (
    <main className="app-frame register-page">
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
      <section className="register-shell">
        <header className="register-header">
          <p className="register-eyebrow">register</p>
          <h1>Join the guest list</h1>
        </header>

        <form className="register-form">
          <label className="register-field">
            <span>first name</span>
            <input
              autoComplete="given-name"
              name="firstName"
              type="text"
            />
          </label>

          <label className="register-field">
            <span>last name</span>
            <input
              autoComplete="family-name"
              name="lastName"
              type="text"
            />
          </label>

          <label className="register-field">
            <span>phone number</span>
            <input
              autoComplete="tel"
              inputMode="tel"
              name="phoneNumber"
              type="tel"
            />
          </label>

          <label className="register-field">
            <span>profile photo</span>
            <input
              accept="image/*"
              name="profilePhoto"
              type="file"
            />
          </label>

          <button className="register-button" type="submit">
            sign up
          </button>
        </form>

        <Link className="register-back" href="/overview">
          back to overview
        </Link>
      </section>
    </main>
  );
}
