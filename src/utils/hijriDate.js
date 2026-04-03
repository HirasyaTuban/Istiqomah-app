export async function getHijriDate() {

  const res = await fetch(
    "https://api.aladhan.com/v1/gToH"
  );

  const data = await res.json();

  return data.data.hijri;

}