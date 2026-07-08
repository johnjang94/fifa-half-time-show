import Link from "next/link";

export const metadata = {
  title: "Register | FIFA X BTS Watch Party",
};

export default function RegisterPage() {
  return (
    <main className="app-frame register-page">
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
