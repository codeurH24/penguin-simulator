class FileSystemService {
    constructor(context) {
        this.context = context;
        this.user = context.currentUser;
        this.permissionsSystem = new PermissionsSystem(this);
        this.fileSystem = new FileSystem(this);
    }

    getFile(fileSystemPath) {
        // vérifier les permission et retourner un message d'erreur si il y a erreur sinon retourner 
        this.context.fileSystem[fileSystemPath];
    }
    setFile(fileSystemPath, fileSystem=null) {
        /*
        vérifier les permission et retourner un message d'erreur si il y a erreur sinon continuer
        Si filesystem est nul alors création du fichier.
        Si fileSystem n'est pas null alors 
        - controle que le contenu à changer est bien du meme type sinon erreur.
        - mise à jour du fichier avec toutes ces caracteristiques (permissions, size, type)
        */
    }
}

class PermissionsSystem {
    constructor(FileSystemService) {
        this.fileSystemService = FileSystemService;
    }

    hasPermission(fileSystemPath, user, askPermission) {}
    getPermissions() {}
    canRead() {}
    canWrite() {}
    canExecute() {}
    readEnable() {}
    readDisble() {}
    writeEnalble() {}
    writeDisable() {}
    executeEnable() {}
    executeDisable() {}
}

class FileSystem {
    
    constructor(FileSystemService) {
        this.fileSystemService = FileSystemService;
    }

    setContent(content) {}
    getContent() {}
    setPermissions(permission=755) { /* utiliser la classe this.fileSystemService.permissionsSystem */ }
    getPermissions() { /* utiliser la classe this.fileSystemService.permissionsSystem */ }
    setDateCreate(date) {}
    getDateCreate() {}
    refreshDateCreate() {}
    setDateAccess(date) {}
    getDateAccess() {}
    refreshDateAccess() {}
    setTypeDir() {}
    setTypeFile() {}
    getType() {}
    isDir() {}
    isFile() {}
    getSize() {}
}