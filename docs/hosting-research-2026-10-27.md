# Hosting and domain research — 27 October 2026

## What this app needs

React's production build is served by Express. The app also needs MySQL,
persistent storage and a Node.js process that stays running for reminder jobs.
A static hosting plan alone cannot run the complete app. My starting estimate
for modest personal/small-group usage is 2–4 GB RAM, with 4 GB preferred when
MySQL and Node share a server. This is a sizing estimate, not a load-test result.

## Hosting comparison

| Provider/plan | Published price | Resources | Assessment |
| --- | --- | --- | --- |
| Hostinger KVM 1 | $6.49/month introductory; $11.99/month renewal displayed for two years | 1 vCPU, 4 GB RAM, 50 GB NVMe, 4 TB bandwidth | Practical low-cost starting VPS. Weekly backups included. |
| Hostinger KVM 2 | $8.79/month introductory; $14.99/month renewal displayed for two years | 2 vCPU, 8 GB RAM, 100 GB NVMe, 8 TB bandwidth | My practical recommendation if the budget permits: more room for MySQL, builds and growth. |
| Hetzner CX23, EU | €5.49/month excluding IPv4 and VAT; IPv4 adds €0.50/month | 2 shared vCPU, 4 GB RAM, 40 GB NVMe, 20 TB EU transfer | Strong value on paper, but the current product page marks it unavailable. Do not plan launch around it without checking stock. |
| DigitalOcean Basic | $12/month | 1 vCPU, 2 GiB RAM, 50 GiB SSD, 2,000 GiB transfer | Straightforward monthly option; less memory per dollar. The 4 GiB/2 vCPU tier is $24/month. |
| Railway Hobby | $5/month minimum, including $5 resource usage | App/database billed by actual usage | Less server administration. $5 is not a fixed price for the app plus MySQL; monitor usage and keep the reminder service running. |

Hostinger's advertised monthly rates represent prepaid terms: check the actual
total due, contract duration, tax and renewal cost before purchase. VPS choices
require operating-system updates, database care and deployment administration.
Included server snapshots should be supplemented with separate database backups.

Sources:

- [Hostinger live VPS plans](https://www.hostinger.com/vps-hosting)
- [Hetzner price adjustment effective 15 June 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Hetzner cost-optimized plans and availability](https://www.hetzner.com/cloud/cost-optimized/)
- [Hetzner IP pricing](https://docs.hetzner.com/cloud/servers/overview/)
- [DigitalOcean Droplet prices](https://www.digitalocean.com/pricing/droplets)
- [Railway plans and included usage](https://docs.railway.com/pricing/plans)

## Domain names

The current branding is yawmeh.me. I have not established ownership or
availability of that exact name, or of any alternative. These are ordinary,
non-premium extension prices, not quotes for an available brand name.

| Registrar/extension | Published annual price | Consideration |
| --- | --- | --- |
| Porkbun .me | $17.27 ordinary registration/renewal | Keeps the existing brand extension if the exact name is obtainable. |
| Porkbun .com | $11.08 ordinary registration/renewal | Lower recurring domain cost if you can obtain a suitable name. |
| Cloudflare Registrar | Registry/ICANN cost without registrar markup | Compare its live checkout for the chosen extension and name; no exact price verified here. |

Porkbun's domain pricing table says its listed prices include ICANN and other
fees. Confirm the registration and renewal columns at checkout rather than
relying on a promotional banner. Cloudflare includes DNS and DNSSEC; review its
nameserver requirements if choosing it as registrar.

Sources:

- [Porkbun detailed registration, renewal and transfer table](https://porkbun.com/products/domains)
- [Porkbun .me](https://porkbun.com/tld/me)
- [Porkbun .com](https://porkbun.com/tld/com)
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)
- [Cloudflare nameserver documentation](https://developers.cloudflare.com/dns/nameservers/update-nameservers/)

## Recommendation and budget

Choose Hostinger KVM 1 for a small starting budget, or KVM 2 for additional
headroom, and buy the domain separately at Porkbun after verifying the name.
If Hetzner CX23 returns to stock, compare its final checkout against Hostinger's
renewal price before committing to a long prepaid term.

At the displayed rates, KVM 1 plus an ordinary .me domain is **$95.15 per year
equivalent initially**, then **$161.15 per year equivalent at renewal**.
KVM 2 plus .me is **$122.75 initially**, then **$197.15 at renewal**.
These are annualized comparisons, not the checkout total: prepaid terms can
require more than one year upfront. They exclude tax, SMTP service, independent
backup storage, optional paid speech and future price changes.

Deploy one Node process and MySQL behind an HTTPS reverse proxy. Keep MySQL
private, serve the frontend and API from the same public origin, configure
production security settings and SMTP, and restore-test database backups.
Use `HOST=127.0.0.1` with a same-server reverse proxy; container/platform routing
may require `HOST=0.0.0.0` within its isolated network. No hosting, domain purchase
or public deployment was performed during this review.
