const hijriMonths = [
  "Muharram",
  "Safar",
  "Rabiul Awal",
  "Rabiul Akhir",
  "Jumadil Awal",
  "Jumadil Akhir",
  "Rajab",
  "Syaban",
  "Ramadhan",
  "Syawal",
  "Zulkaidah",
  "Zulhijjah"
];

function gregorianToJulianDay(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function julianDayToHijri(jd) {
  let l = jd - 1948440 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;

  let j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);

  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { day, month, year };
}

function gregorianToHijri(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const jd = gregorianToJulianDay(year, month, day);
  return julianDayToHijri(jd);
}

export function getTodayInfo() {
  const today = new Date();

  const gregorianDate = today.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const hijri = gregorianToHijri(today);

  let hijriDay = Number(hijri.day);
  let hijriMonth = Number(hijri.month);
  let hijriYear = Number(hijri.year);

  // Guard biar tidak keluar range
  if (!Number.isFinite(hijriDay) || hijriDay < 1) hijriDay = 1;
  if (!Number.isFinite(hijriMonth) || hijriMonth < 1) hijriMonth = 1;
  if (hijriMonth > 12) hijriMonth = 12;
  if (!Number.isFinite(hijriYear)) hijriYear = today.getFullYear() - 579;

  const monthName = hijriMonths[hijriMonth - 1] || "Hijriyah";
  const hijriDate = `${hijriDay} ${monthName} ${hijriYear} H`;

  return {
    gregorianDate,
    hijriDate,
    hijriDay,
    hijriMonth,
    hijriYear
  };
}

export function getHijriChallenge(month) {
  const challenges = {
    1: { name: "Muharram", challenge: "Hijrah Amal", description: "Memulai tahun dengan taubat, niat baru, dan amal konsisten." },
    2: { name: "Safar", challenge: "Istiqomah", description: "Menjaga amal kecil tetapi rutin." },
    3: { name: "Rabiul Awwal", challenge: "Cinta Rasul", description: "Memperbanyak shalawat dan membaca sirah." },
    4: { name: "Rabiul Akhir", challenge: "Akhlaq Mulia", description: "Fokus memperbaiki adab dan akhlak." },
    5: { name: "Jumadil Ula", challenge: "Dzikir Harian", description: "Menjaga dzikir pagi dan petang." },
    6: { name: "Jumadil Akhir", challenge: "Sedekah", description: "Membiasakan sedekah kecil setiap hari." },
    7: { name: "Rajab", challenge: "Persiapan Ramadhan", description: "Mulai meningkatkan ibadah." },
    8: { name: "Sya'ban", challenge: "Pemanasan Amal", description: "Menyiapkan diri menuju Ramadhan." },
    9: { name: "Ramadhan", challenge: "Bulan Al Qur'an", description: "Tilawah, qiyam, dan sedekah maksimal." },
    10: { name: "Syawal", challenge: "Puasa Syawal", description: "Menjaga amal setelah Ramadhan." },
    11: { name: "Dzulqa'dah", challenge: "Menjaga Konsistensi", description: "Istiqomah amal setelah musim ibadah." },
    12: { name: "Dzulhijjah", challenge: "Musim Kebaikan", description: "Puasa Arafah, takbir, dan amal terbaik." }
  };

  return challenges[month] || null;
}

export function getHijriEvent(hijriMonth, hijriDay) {
  const events = {
    "1-1": { title: "Tahun Baru Hijriah", description: "Momentum hijrah, muhasabah, dan memperbarui niat." },
    "1-10": { title: "Puasa Asyura", description: "Hari istimewa untuk berpuasa dan memperbanyak amal." },
    "3-12": { title: "Maulid Nabi", description: "Momentum memperbanyak shalawat dan meneladani Rasulullah." },
    "8-15": { title: "Nisfu Sya'ban", description: "Momentum muhasabah, doa, dan persiapan menuju Ramadhan." },
    "9-1": { title: "Awal Ramadhan", description: "Mulai bulan puasa, tilawah, qiyam, dan amal terbaik." },
    "9-17": { title: "Nuzulul Qur'an", description: "Momentum mendekat dengan Al-Qur'an." },
    "10-1": { title: "Idul Fitri", description: "Hari kemenangan, syukur, dan menjaga amal setelah Ramadhan." },
    "12-9": { title: "Arafah", description: "Hari istimewa untuk puasa, doa, dan dzikir." },
    "12-10": { title: "Idul Adha", description: "Momentum pengorbanan, keikhlasan, dan berbagi." }
  };

  const key = `${hijriMonth}-${hijriDay}`;
  return events[key] || null;
}

export function getHijriFocus(month) {
  const focusMap = {
    1: { monthName: "Muharram", focusTitle: "Hijrah Amal", focusItems: ["Perbanyak taubat dan muhasabah", "Puasa sunnah", "Mulai kebiasaan amal baru"] },
    2: { monthName: "Safar", focusTitle: "Jaga Konsistensi", focusItems: ["Amal kecil tapi rutin", "Perbaiki shalat wajib", "Biasakan dzikir harian"] },
    3: { monthName: "Rabiul Awwal", focusTitle: "Cinta Rasul", focusItems: ["Perbanyak shalawat", "Baca sirah Nabi", "Latih akhlaq mulia"] },
    4: { monthName: "Rabiul Akhir", focusTitle: "Akhlaq Mulia", focusItems: ["Jaga lisan", "Hormati orang tua", "Perbaiki adab harian"] },
    5: { monthName: "Jumadil Ula", focusTitle: "Dzikir Harian", focusItems: ["Dzikir pagi", "Dzikir petang", "Istighfar rutin"] },
    6: { monthName: "Jumadil Akhir", focusTitle: "Sedekah dan Kepedulian", focusItems: ["Sedekah kecil harian", "Bantu keluarga", "Berbagi makanan"] },
    7: { monthName: "Rajab", focusTitle: "Persiapan Ramadhan", focusItems: ["Puasa sunnah", "Perbanyak istighfar", "Tingkatkan tilawah"] },
    8: { monthName: "Sya'ban", focusTitle: "Pemanasan Amal", focusItems: ["Latihan puasa", "Tilawah lebih rutin", "Mulai qiyam malam"] },
    9: { monthName: "Ramadhan", focusTitle: "Bulan Al-Qur'an", focusItems: ["Tilawah harian", "Qiyam / tarawih", "Sedekah maksimal"] },
    10: { monthName: "Syawal", focusTitle: "Jaga Amal Setelah Ramadhan", focusItems: ["Puasa Syawal 6 hari", "Jaga tilawah", "Pertahankan amal Ramadhan"] },
    11: { monthName: "Dzulqa'dah", focusTitle: "Menjaga Ritme Ibadah", focusItems: ["Jangan turun semangat", "Perkuat shalat sunnah", "Stabilkan dzikir"] },
    12: { monthName: "Dzulhijjah", focusTitle: "Musim Kebaikan", focusItems: ["Puasa Arafah", "Perbanyak takbir", "Sedekah dan qurban"] }
  };

  return focusMap[month] || null;
}