"use client";

import { supabase } from "../../lib/supabase";

export default function TestPage() {
  async function testConnection() {
    const { data, error } =
      await supabase.auth.getSession();

    console.log(data);

    console.log(error);

    alert(
      "Supabase Connected Successfully"
    );
  }

  return (
    <div className="p-10">
      <button
        onClick={testConnection}
        className="
          bg-green-600
          text-white
          px-6 py-4
          rounded-2xl
        "
      >
        Test Supabase
      </button>
    </div>
  );
}