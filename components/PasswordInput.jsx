"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const defaultClassName =
  "w-full rounded-2xl border px-4 py-3 pr-12 text-sm outline-none transition-all duration-200";

const defaultStyle = {
  background: "#1F2937",
  borderColor: "#374151",
  color: "#E5E7EB",
};

const PasswordInput = forwardRef(function PasswordInput(
  { className, style, ...props },
  ref,
) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative w-full">
      <input
        {...props}
        ref={ref}
        type={show ? "text" : "password"}
        className={className ?? defaultClassName}
        style={style ?? defaultStyle}
      />

      <button
        type="button"
        onClick={() => setShow((value) => !value)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 hover:text-gray-200"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});

export default PasswordInput;
