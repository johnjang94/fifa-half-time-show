"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionGuard } from "../../components/session-guard";
import { SESSION_KEY } from "../../components/session-lifecycle";
import { usePersistentInviteToken } from "../../components/use-persistent-invite-token";

const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "https://fifa-control.onrender.com";

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function ParticipantCard({ participant }) {
  const firstName = normalize(participant.firstName) || "guest";
  const profilePhotoUrl = normalize(participant.profilePhotoUrl);

  return (
    <li className="portal-list-item" role="listitem" aria-label={firstName}>
      <div className="portal-action-button portal-list-button" aria-hidden="true">
        <div className="portal-list-photo-wrap">
          {profilePhotoUrl ? (
            <Image alt="" fill className="portal-list-photo" src={profilePhotoUrl} />
          ) : (
            <span className="portal-list-photo-fallback">{firstName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <span className="portal-list-name">{firstName}</span>
      </div>
    </li>
  );
}

function ListPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inviteToken, isResolved } = usePersistentInviteToken(searchParams?.get("invite"));
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isResolved) {
      return;
    }

    if (!inviteToken) {
      router.replace("/");
      return;
    }

    if (!sessionStorage.getItem(SESSION_KEY)) {
      router.replace("/");
      return;
    }
  }, [inviteToken, isResolved, router]);

  useEffect(() => {
    if (!isResolved || !inviteToken) {
      return;
    }

    let cancelled = false;
    setParticipants([]);
    setIsLoading(true);

    async function loadParticipants() {
      try {
        const response = await fetch(
          `${controlBaseUrl}/api/invites/list?inviteToken=${encodeURIComponent(inviteToken)}`,
          { cache: "no-store" },
        );
        const data = await response.json();

        if (!cancelled && response.ok && data.ok) {
          setParticipants(Array.isArray(data.participants) ? data.participants : []);
        }
      } catch {
        if (!cancelled) {
          setParticipants([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadParticipants();

    return () => {
      cancelled = true;
    };
  }, [inviteToken, isResolved]);

  if (!isResolved) {
    return null;
  }

  if (typeof window !== "undefined" && !sessionStorage.getItem(SESSION_KEY)) {
    return null;
  }

  if (!inviteToken) {
    return null;
  }

  return (
    <main className={`app-frame portal-page list-page ${isVisible ? "is-visible" : ""}`}>
      <SessionGuard />
      <section className="portal-shell list-shell">
        <header className="portal-header list-header">
          <h1>who&apos;s coming</h1>
        </header>

        <section className="portal-actions list-actions" aria-label="Participants">
          {isLoading ? (
            <div className="portal-list-empty" role="status">
              loading
            </div>
          ) : participants.length ? (
            <ol className="portal-list" role="list">
              {participants.map((participant) => (
                <ParticipantCard participant={participant} key={participant.id} />
              ))}
            </ol>
          ) : (
            <div className="portal-list-empty" role="status">
              no one yet
            </div>
          )}
        </section>

        <Link className="portal-inline-link list-back-link" href={`/portal?invite=${encodeURIComponent(inviteToken)}`}>
          Back to portal
        </Link>
      </section>
    </main>
  );
}

export default function ListPage() {
  return (
    <Suspense fallback={null}>
      <ListPageInner />
    </Suspense>
  );
}
