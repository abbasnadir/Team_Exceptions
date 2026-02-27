"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem("vaniflow_token");
    router.replace("/");
  }, [router]);

  return (
    <div>
      <p>Signing out...</p>
    </div>
  );
}
