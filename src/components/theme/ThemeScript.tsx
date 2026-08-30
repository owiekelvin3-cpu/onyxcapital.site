/** Applies saved theme before first paint to avoid flash. */
export function ThemeScript() {
  const script = `(function(){try{var s=localStorage.getItem("onyx-theme");var d=s!=="light";if(d)document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){document.documentElement.classList.add("dark");}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
