# Texturas procedurais (sem imagens de terceiros) para o acabamento real do iPhone 14 Pro:
#  - aço inoxidável polido: microvariação de brilho + micro-riscos finos (rugosidade e normal)
#  - vidro traseiro "textured matte glass": grão fino (normal)
#  - interior das lentes: anéis dos elementos ópticos (7 na principal, 6 nas outras) com reflexos de revestimento
# Uso: python3 scripts/blender/gerar-texturas.py scripts/blender/texturas
import sys, os, numpy as np
from PIL import Image
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
N = 1024
rng = np.random.default_rng(14)

def ruido(sigma):
    """ruído contínuo e repetível sem emenda (filtro gaussiano no domínio da frequência)"""
    f = np.fft.fftfreq(N)
    fx, fy = np.meshgrid(f, f)
    g = np.exp(-(fx ** 2 + fy ** 2) * (2 * np.pi * sigma) ** 2 / 2)
    r = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((N, N))) * g))
    return (r - r.mean()) / (r.std() + 1e-9)

def normal_de(h, forca):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * forca
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * forca
    n = np.dstack([-gx, -gy, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))

def riscos(qtd, comp, larg):
    h = np.zeros((N, N))
    for _ in range(qtd):
        x, y = rng.uniform(0, N, 2); ang = rng.uniform(0, np.pi); L = rng.uniform(*comp)
        t = np.linspace(0, L, int(L * 2))
        xs = ((x + np.cos(ang) * t) % N).astype(int); ys = ((y + np.sin(ang) * t) % N).astype(int)
        h[ys, xs] += rng.uniform(0.4, 1.0)
    # alarga levemente (riscos muito finos)
    k = np.fft.fftfreq(N); kx, ky = np.meshgrid(k, k)
    return np.real(np.fft.ifft2(np.fft.fft2(h) * np.exp(-(kx ** 2 + ky ** 2) * (2 * np.pi * larg) ** 2 / 2)))

# 1) aço inoxidável polido (PVD preto-espacial): quase espelhado, com microvariação e riscos de uso bem sutis
var = ruido(18) * 0.5 + ruido(3) * 0.25
sc = riscos(45, (30, 180), 0.6); sc = sc / (sc.max() + 1e-9)
rug = np.clip(0.84 + var * 0.05 + sc * 0.12, 0, 1)        # multiplicador da rugosidade (0,14 × ~0,8–1,2)
Image.fromarray((rug * 0.15 * 255).astype(np.uint8), 'L').save(f'{out}/aco-rugosidade.png')  # valor absoluto ~0,11–0,18
normal_de(var * 0.12 - sc * 0.35, 1.0).save(f'{out}/aco-normal.png')

# 2) vidro traseiro texturizado fosco: grão fino e uniforme
grao = ruido(1.1) + ruido(2.5) * 0.5
normal_de(grao, 0.55).save(f'{out}/vidro-fosco-normal.png')

# 3) interior das lentes (vista frontal, disco inteiro na textura)
def lente(elementos, nome):
    y, x = np.mgrid[0:N, 0:N]; r = np.hypot(x - N / 2, y - N / 2) / (N / 2)   # 0 no centro, 1 na borda
    ang = np.arctan2(y - N / 2, x - N / 2)
    img = np.zeros((N, N, 3))
    base = np.array([0.0035, 0.004, 0.006])
    img[:] = base
    # anéis dos elementos: bordas finas que refletem o revestimento antirreflexo (verde, azul, violeta)
    cores = [np.array(c) for c in ([0.10, 0.22, 0.16], [0.10, 0.16, 0.34], [0.22, 0.12, 0.32], [0.08, 0.20, 0.30])]
    for i in range(elementos):
        rr = 0.92 - i * (0.78 / elementos)
        borda = np.exp(-((r - rr) / 0.006) ** 2) * (0.55 + 0.45 * np.cos(ang * 2 + i))
        img += borda[..., None] * cores[i % len(cores)] * 0.6
    # reflexo amplo do revestimento (lado superior esquerdo) e pupila escura
    lobo = np.exp(-(((x - N * 0.38) / (N * 0.16)) ** 2 + ((y - N * 0.36) / (N * 0.12)) ** 2))
    img += lobo[..., None] * np.array([0.10, 0.12, 0.26]) * 0.6
    pupila = r < 0.16
    img[pupila] = base * 0.4
    brilho = np.exp(-(((x - N * 0.46) / (N * 0.02)) ** 2 + ((y - N * 0.45) / (N * 0.02)) ** 2))
    img += brilho[..., None] * 0.7
    img[r > 0.985] = base
    Image.fromarray((np.clip(img, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)).save(f'{out}/{nome}.png')
lente(7, 'lente-principal')
lente(6, 'lente-secundaria')
print('ok', sorted(os.listdir(out)))
