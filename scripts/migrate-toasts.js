// Script to migrate all alert() calls to react-toastify
const fs = require('fs');
const path = require('path');

const filesToMigrate = [
    'app/integraciones/page.tsx',
    'app/perfil/page.tsx',
    'app/pagos/page.tsx',
    'app/crear-noticiero/page.tsx',
    'app/automatizacion/page.tsx',
    'app/activos/page.tsx',
    'app/timeline-noticiero/[id]/page.tsx',
    'app/timeline-noticiero/[id]/components/AddNewsModal.tsx',
    'app/timeline-noticiero/[id]/components/GenerateAudioButton.tsx',
    'app/timeline-noticiero/[id]/components/AddAudioModal.tsx',
    'app/timeline-noticiero/[id]/components/AdjustDurationModal.tsx',
    'app/timeline-noticiero/[id]/components/BackgroundMusicBar.tsx',
    'app/timeline-noticiero/[id]/components/BackgroundMusicConfig.tsx',
    'app/timeline-noticiero/[id]/components/NewsCard.tsx',
    'app/timeline-noticiero/[id]/components/AddAdModal.tsx',
    'app/bibliotecas/components/CreateCampaignModal.tsx',
    'components/mercadopago-button.tsx',
    'components/ultimo-minuto/breaking-news-card.tsx'
];

function migrateFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Add import if not present
    if (!content.includes("from 'react-toastify'")) {
        if (content.includes("'use client'")) {
            content = content.replace("'use client'", "'use client'\n\nimport { toast } from 'react-toastify'");
        }
    }

    // Remove old toast imports
    content = content.replace(/import \{ toast \} from 'sonner'[\r\n]*/g, '');
    content = content.replace(/import \{ toast \} from 'react-hot-toast'[\r\n]*/g, '');

    // Replace alert() with appropriate toast type

    // Success patterns with backticks
    content = content.replace(/alert\(`✅([^`]*)`\)/g, 'toast.success(`$1`)');
    content = content.replace(/alert\(`🎙️([^`]*)`\)/g, 'toast.success(`$1`)');
    content = content.replace(/alert\(`Configuración guardada([^`]*)`\)/g, 'toast.success(`Configuración guardada$1`)');
    content = content.replace(/alert\(`Configuración de scraping guardada([^`]*)`\)/g, 'toast.success(`Configuración de scraping guardada$1`)');
    content = content.replace(/alert\(`Configuración de IA guardada([^`]*)`\)/g, 'toast.success(`Configuración de IA guardada$1`)');
    content = content.replace(/alert\(`Editando([^`]*)`\)/g, 'toast.info(`Editando$1`)');

    // Error patterns with backticks
    content = content.replace(/alert\(`❌([^`]*)`\)/g, 'toast.error(`$1`)');
    content = content.replace(/alert\(`Error([^`]*)`\)/g, 'toast.error(`Error$1`)');

    // Success patterns with single quotes
    content = content.replace(/alert\('✅([^']*)'\)/g, "toast.success('$1')");
    content = content.replace(/alert\('([^']*exitosamente[^']*)'\)/g, "toast.success('$1')");
    content = content.replace(/alert\('([^']*guardada[^']*)'\)/g, "toast.success('$1')");
    content = content.replace(/alert\('([^']*iniciado[^']*)'\)/g, "toast.success('$1')");
    content = content.replace(/alert\('Copiado al portapapeles'\)/g, "toast.success('Copiado al portapapeles')");

    // Error patterns with single quotes
    content = content.replace(/alert\('Error([^']*)'\)/g, "toast.error('Error$1')");
    content = content.replace(/alert\('❌([^']*)'\)/g, "toast.error('$1')");
    content = content.replace(/alert\('No se pudo([^']*)'\)/g, "toast.error('No se pudo$1')");

    // Warning patterns
    content = content.replace(/alert\('Por favor([^']*)'\)/g, "toast.warning('Por favor$1')");
    content = content.replace(/alert\('⚠️([^']*)'\)/g, "toast.warning('$1')");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Migrated: ${filePath}`);
    } else {
        console.log(`⏭️  No changes: ${filePath}`);
    }
}

console.log('Starting comprehensive toast migration...\n');

filesToMigrate.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    migrateFile(fullPath);
});

console.log('\n✅ Migration complete!');
