import { AutoRedirect } from "./auto-redirect";

const QR_SIZE = 21;

function sanitizeToken(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "guest";
}

function hashToken(token) {
  let hash = 2166136261;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seed) {
  let state = seed || 1;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function placeFinder(matrix, startRow, startColumn) {
  const finder = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];

  finder.forEach((row, rowOffset) => {
    row.forEach((cell, columnOffset) => {
      matrix[startRow + rowOffset][startColumn + columnOffset] = cell === 1;
    });
  });
}

function buildQrMatrix(token) {
  const matrix = Array.from({ length: QR_SIZE }, () => Array(QR_SIZE).fill(null));
  const random = createRandom(hashToken(token));

  placeFinder(matrix, 0, 0);
  placeFinder(matrix, 0, QR_SIZE - 7);
  placeFinder(matrix, QR_SIZE - 7, 0);

  for (let index = 8; index < QR_SIZE - 8; index += 1) {
    const lineValue = index % 2 === 0;
    matrix[6][index] = lineValue;
    matrix[index][6] = lineValue;
  }

  matrix[QR_SIZE - 8][8] = true;

  for (let row = 0; row < QR_SIZE; row += 1) {
    for (let column = 0; column < QR_SIZE; column += 1) {
      if (matrix[row][column] !== null) {
        continue;
      }

      matrix[row][column] = random() > 0.5;
    }
  }

  return matrix;
}

function QrCode({ token }) {
  const matrix = buildQrMatrix(token);

  return (
    <div
      className="qr-code"
      aria-label="Unique QR code for your registration"
      role="img"
      style={{
        gridTemplateColumns: `repeat(${QR_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${QR_SIZE}, 1fr)`,
      }}
    >
      {matrix.flatMap((row, rowIndex) =>
        row.map((cell, cellIndex) => (
          <span
            aria-hidden="true"
            className={cell ? "qr-pixel qr-pixel-on" : "qr-pixel"}
            key={`${rowIndex}-${cellIndex}`}
          />
        )),
      )}
    </div>
  );
}

export default function ThankYouPage({ searchParams }) {
  const inviteToken = sanitizeToken(searchParams?.invite);

  return (
    <main className="app-frame thank-you-page">
      <AutoRedirect />
      <section className="thank-you-shell">
        <h1>You are going!</h1>
        <QrCode token={inviteToken} />
      </section>
    </main>
  );
}
