# NetSim Lab 2.0

NetSim Lab 2.0 is an interactive networking simulator for learning how common network protocols work. It includes labs for the OSI model, DNS resolution, TCP handshakes, HTTP request journeys, ping and traceroute, subnetting, and common ports and protocols.

All IP addresses, domains, and packet data shown in the simulators are simulated; the app does not send network traffic.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm (included with Node.js)

## Run locally

From the repository root:

```powershell
cd "NetSim Lab 2.0"
npm install
npm run dev
```

Open the local URL printed in the terminal (usually <http://localhost:5173>). Keep the terminal running while using the app; press `Ctrl+C` to stop the server.

## Production build

From this directory, run:

```powershell
npm run build
npm run preview
```

This folder contains the source project. The repository's GitHub Pages workflow currently publishes the project at the repository root, not this nested copy.
