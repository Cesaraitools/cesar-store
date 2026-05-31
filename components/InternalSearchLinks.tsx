import Link from "next/link";

type InternalSearchLink = {
  label: string;
  query?: string;
  href?: string;
};

type InternalSearchLinksProps = {
  title: string;
  description: string;
  links: InternalSearchLink[];
};

function getHref(link: InternalSearchLink) {
  if (link.href) return link.href;

  return `/shop?search=${encodeURIComponent(link.query ?? link.label)}`;
}

export function InternalSearchLinks({ title, description, links }: InternalSearchLinksProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <p className="leading-8 text-slate-600">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={`${link.label}-${getHref(link)}`}
            href={getHref(link)}
            className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
