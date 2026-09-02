/* Farm RPG account importer — shared number helpers.
   Loaded as a classic script in the browser (exposes window.ImporterShared)
   and via require() in Node tests. No dependencies, no network access. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ImporterShared = Object.assign(root.ImporterShared || {}, api);
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  const SUFFIX_EXP = { K: 3, M: 6, B: 9, T: 12 };
  const MAX_SAFE_BIG = BigInt(Number.MAX_SAFE_INTEGER);

  /**
   * Parse a visible quantity string such as "1,234", "1.2K", "1.25M",
   * "2.4B" or "3T".
   *
   * Returns null when the text is not a recognizable quantity (we never
   * invent a value). Otherwise returns:
   *   { raw, value, approximate }
   * where `value` is a Number when it fits safely, or a decimal String when
   * the integer exceeds Number.MAX_SAFE_INTEGER so precision is never lost.
   */
  function parseQuantity(input) {
    if (input === null || input === undefined) return null;
    if (typeof input === "number") {
      if (!Number.isFinite(input)) return null;
      if (Number.isInteger(input) && Number.isSafeInteger(input)) {
        return { raw: String(input), value: input, approximate: false };
      }
      if (Math.abs(input) <= Number.MAX_SAFE_INTEGER) {
        return { raw: String(input), value: input, approximate: true };
      }
      return { raw: String(input), value: String(input), approximate: true };
    }
    const raw = String(input).trim();
    if (!raw) return null;
    const m = raw.match(/^(-?)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*([KMBT])?$/i);
    if (!m) return null;
    const neg = m[1] === "-";
    const mantissa = m[2].replace(/,/g, "");
    const exp = m[3] ? SUFFIX_EXP[m[3].toUpperCase()] : 0;
    const dot = mantissa.indexOf(".");
    const intDigits = dot === -1 ? mantissa : mantissa.slice(0, dot);
    const fracDigits = dot === -1 ? "" : mantissa.slice(dot + 1);
    let num;
    try {
      num = BigInt((intDigits || "0") + fracDigits);
    } catch (err) {
      return null;
    }
    const den = 10n ** BigInt(fracDigits.length);
    const mult = 10n ** BigInt(exp);
    const scaled = num * mult;
    let valueBig;
    let approximate = false;
    if (scaled % den === 0n) {
      valueBig = scaled / den;
    } else {
      const f = (Number(mantissa) || 0) * Math.pow(10, exp);
      if (!Number.isFinite(f)) return null;
      if (Math.abs(f) <= Number.MAX_SAFE_INTEGER) {
        return { raw: raw, value: neg ? -f : f, approximate: true };
      }
      valueBig = BigInt(Math.round(f));
      approximate = true;
    }
    if (neg) valueBig = -valueBig;
    const abs = valueBig < 0n ? -valueBig : valueBig;
    if (abs <= MAX_SAFE_BIG) {
      return { raw: raw, value: Number(valueBig), approximate: approximate };
    }
    return { raw: raw, value: valueBig.toString(), approximate: approximate };
  }

  /** Coerce a stored value (number or numeric string) to BigInt, or null. */
  function toBigInt(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "bigint") return value;
    try {
      if (typeof value === "number") {
        if (!Number.isFinite(value)) return null;
        return BigInt(Math.trunc(value));
      }
      const s = String(value).trim();
      if (!/^-?\d+$/.test(s)) {
        const f = Number(s);
        if (!Number.isFinite(f)) return null;
        return BigInt(Math.trunc(f));
      }
      return BigInt(s);
    } catch (err) {
      return null;
    }
  }

  /** Compact display form: 950 -> "950", 1200000 -> "1.2M". */
  function formatCompact(value) {
    const big = toBigInt(value);
    if (big === null) return value === null || value === undefined ? "—" : String(value);
    const neg = big < 0n;
    let abs = neg ? -big : big;
    if (abs >= 10n ** 16n) {
      // Beyond ~10,000T compact suffixes become unreadable; use exponent form.
      const digits = abs.toString();
      const mantissa = digits[0] + (digits[1] && digits[1] !== "0" ? "." + digits[1] : "");
      return (neg ? "-" : "") + mantissa + "e" + (digits.length - 1);
    }
    const units = [
      [10n ** 12n, "T"],
      [10n ** 9n, "B"],
      [10n ** 6n, "M"],
      [10n ** 3n, "K"],
    ];
    for (const [unit, suffix] of units) {
      if (abs >= unit) {
        const whole = abs / unit;
        const tenth = ((abs % unit) * 10n) / unit;
        let s = whole.toString();
        if (tenth > 0n && whole < 100n) s += "." + tenth.toString();
        return (neg ? "-" : "") + s + suffix;
      }
    }
    return (neg ? "-" : "") + abs.toString();
  }

  /** Full exact form with thousands separators, for tooltips/details. */
  function formatExact(value) {
    if (value === null || value === undefined || value === "") return "unknown";
    const big = toBigInt(value);
    const digits = big === null ? String(value) : big.toString();
    const neg = digits.startsWith("-");
    const body = neg ? digits.slice(1) : digits;
    const grouped = body.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + grouped;
  }

  return {
    parseQuantity: parseQuantity,
    formatCompact: formatCompact,
    formatExact: formatExact,
    toBigInt: toBigInt,
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
  };
});
