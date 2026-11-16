import { headers } from "next/headers";

import DocumentLayout from "@/components/DocumentLayout";

import Custom404 from "./not-found";

export default async function GlobalNotFound() {
  await headers();

  return (
    <DocumentLayout>
      <main id="main-content">
        <Custom404 />
      </main>
    </DocumentLayout>
  );
}
