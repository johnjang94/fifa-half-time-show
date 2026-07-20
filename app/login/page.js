import { GuestExperience } from "../../components/guest-experience";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <GuestExperience initialLoginOpen showIntroNotice={false} />;
}
