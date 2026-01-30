// Media Upload and Management System

class MediaManager {
    constructor() {
        this.uploadedFiles = [];
    }

    async uploadFile(file) {
        // Validate file type
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];

        const isImage = validImageTypes.includes(file.type);
        const isVideo = validVideoTypes.includes(file.type);

        if (!isImage && !isVideo) {
            alert('Invalid file type. Please upload images (JPEG, PNG, GIF, WebP) or videos (MP4, WebM, OGG).');
            return null;
        }

        // Check file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            alert('File too large. Maximum file size is 50MB.');
            return null;
        }

        // Create object URL for preview
        const url = URL.createObjectURL(file);
        const type = isImage ? 'image' : 'video';

        const media = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: type,
            url: url,
            file: file,
            size: this.formatFileSize(file.size)
        };

        this.uploadedFiles.push(media);
        return media;
    }

    removeFile(mediaId) {
        const index = this.uploadedFiles.findIndex(m => m.id === mediaId);
        if (index >= 0) {
            // Revoke object URL to free memory
            URL.revokeObjectURL(this.uploadedFiles[index].url);
            this.uploadedFiles.splice(index, 1);
        }
    }

    clearAll() {
        // Revoke all object URLs
        this.uploadedFiles.forEach(media => {
            URL.revokeObjectURL(media.url);
        });
        this.uploadedFiles = [];

        // Clear gallery UI
        const gallery = document.getElementById('media-gallery');
        if (gallery) {
            gallery.innerHTML = '';
        }
    }

    getEmbedCode(media) {
        const path = media.type === 'image'
            ? `../media/images/${media.name}`
            : `../media/videos/${media.name}`;

        if (media.type === 'image') {
            return `<img src="${path}" alt="${media.name}" class="essay-image" />`;
        } else {
            return `<video src="${path}" controls class="essay-video"></video>`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Initialize global media manager
window.mediaManager = new MediaManager();

// Set up event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('upload-media-btn');
    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.multiple = true;

        input.onchange = async (e) => {
            for (const file of e.target.files) {
                const media = await window.mediaManager.uploadFile(file);
                if (media) {
                    addMediaToGallery(media);
                }
            }
        };

        input.click();
    });
});

// Add media to gallery UI
function addMediaToGallery(media) {
    const gallery = document.getElementById('media-gallery');
    if (!gallery) return;

    const item = document.createElement('div');
    item.className = 'media-item';
    item.dataset.mediaId = media.id;
    item.title = `${media.name} (${media.size})\nClick to insert into essay`;

    if (media.type === 'image') {
        item.innerHTML = `
            <img src="${media.url}" alt="${media.name}">
            <button class="remove-media" onclick="removeMedia('${media.id}', event)" title="Remove">×</button>
        `;
    } else {
        item.innerHTML = `
            <video src="${media.url}" muted></video>
            <button class="remove-media" onclick="removeMedia('${media.id}', event)" title="Remove">×</button>
        `;
    }

    // Make item clickable to insert into editor
    item.addEventListener('click', (e) => {
        // Don't insert if clicking remove button
        if (e.target.classList.contains('remove-media')) {
            return;
        }

        const embedCode = window.mediaManager.getEmbedCode(media);
        if (tinymceEditor) {
            tinymceEditor.insertContent(embedCode);
            alert(`${media.type === 'image' ? 'Image' : 'Video'} inserted into essay!\n\nRemember to upload ${media.name} to media/${media.type}s/ when you save.`);
        }
    });

    gallery.appendChild(item);
}

// Remove media from gallery
function removeMedia(mediaId, event) {
    if (event) {
        event.stopPropagation();
    }

    if (confirm('Remove this media file?')) {
        window.mediaManager.removeFile(mediaId);

        const item = document.querySelector(`[data-media-id="${mediaId}"]`);
        if (item) {
            item.remove();
        }
    }
}
