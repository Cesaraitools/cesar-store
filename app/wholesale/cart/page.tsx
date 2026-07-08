import { redirect } from "next/navigation";

export default function WholesaleCartRedirectPage() {
  redirect("/wholesale/order");
}
