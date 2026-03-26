import bcrypt from 'bcrypt';
import prisma from '../db.js';
import { uploadViaPresignedUrl } from '../s3.js';
import { createPendingUploadRecord, confirmPendingUpload } from '../services/uploads.js';

const SEED_EMAIL = 'test@example.com';
const SEED_PASSWORD = 'password123';

const SAMPLE_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 18 Tf 36 120 Td (Seed PDF Sample) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
294
%%EOF
`,
  'utf8',
);

const SAMPLE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5P4coAAAAASUVORK5CYII=',
  'base64',
);

const SAMPLE_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBAVFhUVFRUVFRUVFRUVFRUXFhUXFhUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGxAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAAAQID/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAB6A//xAAXEAEAAwAAAAAAAAAAAAAAAAAAAREh/9oACAEBAAEFAmP/xAAVEQEBAAAAAAAAAAAAAAAAAAAAEf/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPwF//8QAFxABAQEBAAAAAAAAAAAAAAAAAREAITFhcf/aAAgBAQAGPwJqZ//EABcQAQEBAQAAAAAAAAAAAAAAAAERACH/2gAIAQEAAT8hyu0T/9oADAMBAAIAAwAAABCf/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPxB//8QAFxABAQEBAAAAAAAAAAAAAAAAAREAITFhcf/aAAgBAQABPxB1QXyaKstA3//Z',
  'base64',
);

const SAMPLE_ZIP = Buffer.from([
  0x50, 0x4b, 0x05, 0x06,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00,
]);

function sampleContentFor(name: string, mimeType: string): Buffer {
  switch (mimeType) {
    case 'text/plain':
      return Buffer.from(`Sample seed file for ${name}\n`, 'utf8');
    case 'application/pdf':
      return SAMPLE_PDF;
    case 'image/jpeg':
      return SAMPLE_JPEG;
    case 'image/png':
      return SAMPLE_PNG;
    case 'image/svg+xml':
      return Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80">
  <rect width="160" height="80" fill="#f4efe5" />
  <circle cx="40" cy="40" r="18" fill="#0f766e" />
  <text x="68" y="46" font-size="18" fill="#1f2937">Seed SVG</text>
</svg>`,
        'utf8',
      );
    case 'application/zip':
      return SAMPLE_ZIP;
    default:
      return Buffer.from(`Binary seed content for ${name}`, 'utf8');
  }
}

async function seedUploadedFile(input: {
  userId: string;
  name: string;
  mimeType: string;
  parentId?: string | null;
}) {
  const content = sampleContentFor(input.name, input.mimeType);
  const { file, uploadUrl } = await createPendingUploadRecord({
    userId: input.userId,
    name: input.name,
    mimeType: input.mimeType,
    size: content.length,
    parentId: input.parentId ?? null,
  });

  await uploadViaPresignedUrl(uploadUrl, content, input.mimeType);

  const result = await confirmPendingUpload(file.id, input.userId);
  if (result !== 'confirmed' && result !== 'already-confirmed') {
    throw new Error(`Failed to seed upload for ${input.name}: ${result}`);
  }

  return prisma.file.findUniqueOrThrow({ where: { id: file.id } });
}

export async function seed() {
  const existing = await prisma.user.findUnique({ where: { email: SEED_EMAIL } });
  if (existing) {
    await prisma.file.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const user = await prisma.user.create({
    data: { email: SEED_EMAIL, passwordHash },
  });

  const userId = user.id;

  const documents = await prisma.file.create({
    data: { name: 'Documents', isFolder: true, uploadStatus: 'uploaded', userId },
  });

  const photos = await prisma.file.create({
    data: { name: 'Photos', isFolder: true, uploadStatus: 'uploaded', userId },
  });

  const work = await prisma.file.create({
    data: { name: 'Work', isFolder: true, uploadStatus: 'uploaded', userId, parentId: documents.id },
  });

  const vacation = await prisma.file.create({
    data: { name: 'Vacation', isFolder: true, uploadStatus: 'uploaded', userId, parentId: photos.id },
  });

  const createdFiles = await Promise.all([
    seedUploadedFile({ userId, name: 'readme.txt', mimeType: 'text/plain' }),
    seedUploadedFile({ userId, name: 'notes.txt', mimeType: 'text/plain' }),
    seedUploadedFile({ userId, name: 'report.pdf', mimeType: 'application/pdf', parentId: documents.id }),
    seedUploadedFile({ userId, name: 'budget.pdf', mimeType: 'application/pdf', parentId: work.id }),
    seedUploadedFile({ userId, name: 'presentation.pdf', mimeType: 'application/pdf', parentId: work.id }),
    seedUploadedFile({ userId, name: 'beach.jpg', mimeType: 'image/jpeg', parentId: vacation.id }),
    seedUploadedFile({ userId, name: 'sunset.png', mimeType: 'image/png', parentId: vacation.id }),
    seedUploadedFile({ userId, name: 'logo.svg', mimeType: 'image/svg+xml' }),
    seedUploadedFile({ userId, name: 'archive.zip', mimeType: 'application/zip' }),
  ]);

  await prisma.file.update({
    where: { id: createdFiles.find((file) => file.name === 'report.pdf')!.id },
    data: { starred: true },
  });
  await prisma.file.update({ where: { id: photos.id }, data: { starred: true } });

  const trashedFolder = await prisma.file.create({
    data: { name: 'Old Stuff', isFolder: true, uploadStatus: 'uploaded', userId },
  });

  const oldFile = await seedUploadedFile({
    userId,
    name: 'old-file.txt',
    mimeType: 'text/plain',
    parentId: trashedFolder.id,
  });

  await prisma.file.update({
    where: { id: trashedFolder.id },
    data: { trashedAt: new Date() },
  });
  await prisma.file.update({
    where: { id: oldFile.id },
    data: { trashedByAncestorId: trashedFolder.id },
  });

  const seededUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  console.log(`Seed complete: user ${SEED_EMAIL} created with ${createdFiles.length + 1} files and 5 folders`);
  console.log(`Storage used: ${seededUser.storageUsed} bytes`);
}

const isMain = process.argv[1]?.includes('seed');
if (isMain) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
