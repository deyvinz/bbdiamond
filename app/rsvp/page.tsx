import { Suspense } from "react";
import RSVPForm from "@/components/RSVPForm";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RSVPForm />
    </Suspense>
  );
}
