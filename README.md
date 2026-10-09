# NetSim Lab

NetSim Lab is an interactive networking simulator for learning how common network protocols work. It includes labs for the OSI model, DNS resolution, TCP handshakes, HTTP request journeys, ping and traceroute, subnetting, and common ports and protocols.

All IP addresses, domains, and packet data shown in the simulators are simulated; the app does not send network traffic.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm (included with Node.js)

## Setup

1. Clone the repository and open its directory:

   ```powershell
   git clone https://github.com/anujsec/netsim-lab.git
   cd netsim-lab
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

## Run locally

Start the development server:

```powershell
npm run dev
```

Open the local URL printed in the terminal (usually <http://localhost:5173>). Keep the terminal running while using the app; press `Ctrl+C` to stop the server.

## Production build

Create an optimized build:

```powershell
npm run build
```

To serve the build locally for a preview:

```powershell
npm run preview
```

The preview command prints the local URL to open.

## Deploy to GitHub Pages

The GitHub Actions workflow builds the app and publishes the `dist/` directory to GitHub Pages whenever changes are pushed to `main`.

For the first deployment, open the repository's **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. After that, check the **Actions** tab for deployment progress. The published site is <https://anujsec.github.io/netsim-lab/>.
