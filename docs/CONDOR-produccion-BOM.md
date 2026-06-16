# CONDOR UTM — Lista de compras / Bill of Materials (producción)

> Configuración: **1 servidor primario** (2º standby especificado), **sala de 4+ puestos**,
> **área acotada (1 aeródromo/faena)**. Precios USD **indicativos** (cotizar en Chile / importación).
> Complementa `CONDOR_UTM_Lista_Compras_Infraestructura.xlsx`.

## 1. Servidor primario (comprar ahora)
| Ítem | Especificación sugerida | Cant. | USD aprox. |
|---|---|---|---|
| Servidor rack 1U/2U | AMD EPYC 16c/32t (o Xeon Silver), placa con IPMI/iLO | 1 | 3.500–6.000 |
| RAM ECC | 128 GB (4×32) | — | (incl.) |
| Disco SO/datos | 2× NVMe 1.92 TB en **RAID1** | — | (incl.) |
| Disco grabación/logs | 2× SSD SATA 3.84 TB (RAID1) | — | 600–900 |
| Red | NIC dual 10 GbE | — | (incl.) |
| Energía | Fuentes redundantes (1+1) | — | (incl.) |
| **Servidor 2º (standby N+1)** | **Idéntico** — especificado/presupuestado, compra en fase de habilitación | (1) | (≈ igual) |

> Alternativa económica para arrancar: workstation torre (Ryzen 9 / Threadripper, 128 GB, 2×NVMe RAID1) ~2.500–3.500.

## 2. Puestos de control (4 o más)
| Ítem | Especificación | Cant. | USD aprox. c/u |
|---|---|---|---|
| PC de puesto | Ryzen 7 / Core i7, 32 GB, SSD 1 TB, GPU discreta básica | 4+ | 900–1.400 |
| Monitor grande | 32" 4K **o** 2× 27" QHD por puesto | 4+ | 400–800 |
| Trackball + teclado | Trackball estilo ATC + teclado | 4+ | 120–200 |
| Auriculares/headset | Para coordinación/CPDLC | 4+ | 60–120 |

## 3. Vigilancia (área acotada)
| Ítem | Especificación | Cant. | USD aprox. |
|---|---|---|---|
| Receptor ADS-B | **Pro:** RadarCape/Mode-S (salida ASTERIX) · **Económico:** RTL-SDR v4 + dump1090 | 1 | 60 (SDR) – 600 (pro) |
| Antena 1090 MHz | Antena + cable coaxial LMR + supresor de rayos | 1 | 120–300 |
| Sensores Remote ID | Receptores BLE/Wi-Fi OpenDroneID (dedicados tipo DroneScout/Dronetag, o Raspberry Pi 5 + BLE/Wi-Fi) | 2–3 | 150–500 c/u |
| PC puente ArduPilot | Mission Planner + `condor-bridge` (puede ser un puesto) | 1 | (reusar) |

## 4. Tiempo (sincronización)
| Ítem | Especificación | Cant. | USD aprox. |
|---|---|---|---|
| NTP estrato-1 GPS | **Pro:** appliance Meinberg/EndRun · **Económico:** Raspberry Pi + GPS HAT (estrato-1) | 1 | 120 (RPi) – 2.000 (pro) |

## 5. Red e infraestructura
| Ítem | Especificación | Cant. | USD aprox. |
|---|---|---|---|
| Switch gestionable | L2/L3, 24 puertos, **VLAN** (LAN aislada de vigilancia) | 1 | 300–800 |
| Firewall/router | pfSense/OPNsense (appliance) o MikroTik | 1 | 300–700 |
| UPS | Online doble conversión ~3 kVA (servidor + puestos) | 1 | 800–1.800 |
| Rack + PDU | 12–24U + PDU + organización de cables | 1 | 400–900 |
| Cableado | Patch panel, cat6/6A, latiguillos | — | 200–400 |

## 6. Software / licencias
| Ítem | Nota | USD |
|---|---|---|
| Rocky Linux 9 | Gratuito (dev/operación) | 0 |
| RHEL 9 (opcional, certificación) | Suscripción con soporte | ~350/año/servidor |
| Supabase auto-alojado | Open source, en Podman | 0 |
| Certificados TLS | Let's Encrypt / CA interna | 0 |

## 7. Estimación rápida (arranque, nodo único)
- Servidor primario + discos: **~4.500–7.000**
- 4 puestos (PC+monitor+periféricos): **~6.000–10.000**
- Vigilancia (área acotada): **~600–2.000**
- Tiempo + red + UPS + rack: **~2.500–6.000**
- **Total arranque ≈ 13.500–25.000 USD** (sin el 2º servidor standby).
- 2º servidor standby (fase habilitación): **~4.500–7.000** adicionales.

> Cifras indicativas para presupuestar; ajustar con cotizaciones reales (importación/IVA Chile).
> Prioridad de compra: (1) servidor primario, (2) red/UPS/NTP, (3) puestos, (4) sensores.
