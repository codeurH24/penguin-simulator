// modules/install-system.js

export function envAddHome(context) {
    const passwdContent = context.fileSystem['/etc/passwd'].content;
    const currentUsername = context.currentUser.username;
    const passwdLines = passwdContent.split('\n');
    const userLine = passwdLines.find(line => line.startsWith(currentUsername + ':'));

    if (userLine) {
        const fields = userLine.split(':');
        const homeDir = fields[5];
        const shell = fields[6];
        
        // Ajouter les variables essentielles
        context.variables.HOME = homeDir;
        context.variables.USER = currentUsername;
        context.variables.LOGNAME = currentUsername;
        context.variables.SHELL = shell;
    }
    
    return context;
}

export function envLoadFromEnvironment(context) {
    const envContent = context.fileSystem['/etc/environment'].content;
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').replace(/^["']|["']$/g, '');
                context.variables[key] = value;
            }
        }
    });
    
    return context;
}