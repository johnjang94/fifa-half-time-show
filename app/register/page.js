import Image from "next/image";
import Link from "next/link";
import heroImage from "../../image.png";
import { RegisterForm } from "./register-form";

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
        </header>

        <div className="register-body">
          <RegisterForm />

          <Link className="register-back" href="/overview">
            back to overview
          </Link>
        </div>
      </section>
    </main>
  );
}
