/**
 * Backup Service Utility
 * Handles database backup creation, listing, and management
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../../backups');
const DB_PATH = path.join(__dirname, '../../prisma/dev.db');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Creates a new backup of the database
 * @returns {Promise<Object>} Backup file details
 */
async function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.db`;
    const destPath = path.join(BACKUP_DIR, filename);

    return new Promise((resolve, reject) => {
        fs.copyFile(DB_PATH, destPath, (err) => {
            if (err) {
                console.error('Backup failed:', err);
                reject(err);
            } else {
                const stats = fs.statSync(destPath);
                resolve({
                    filename,
                    size: stats.size,
                    createdAt: new Date(),
                    path: destPath
                });
            }
        });
    });
}

/**
 * Lists all available backups
 * @returns {Array<Object>} List of backups sorted by date (newest first)
 */
function listBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files
            .filter(file => file.endsWith('.db'))
            .map(file => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    size: stats.size,
                    createdAt: stats.mtime
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt); // Newest first

        return backups;
    } catch (error) {
        console.error('List backups failed:', error);
        return [];
    }
}

/**
 * Deletes a specific backup
 * @param {string} filename 
 */
function deleteBackup(filename) {
    const filePath = path.join(BACKUP_DIR, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
}

/**
 * Gets the absolute path for a backup file
 * @param {string} filename 
 * @returns {string|null} Path if exists, null otherwise
 */
function getBackupPath(filename) {
    const filePath = path.join(BACKUP_DIR, filename);
    if (fs.existsSync(filePath)) {
        return filePath;
    }
    return null;
}

module.exports = {
    createBackup,
    listBackups,
    deleteBackup,
    getBackupPath
};
