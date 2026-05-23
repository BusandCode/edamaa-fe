declare function getDeniedSteps({ osName, browserName, media }: {
    osName: any;
    browserName: any;
    media: any;
}): any[];
declare function getSysDeniedSteps({ osName, media }: {
    osName: any;
    media: any;
}): string[];
declare function getDeniedImage({ browserName, isMobile, osName }: {
    browserName: any;
    isMobile: any;
    osName: any;
}): "" | "Desktop_Chrome.mp4" | "Chrome_ios.mp4" | "Android_Chrome.mp4" | "Desktop_Firefox.mp4" | "Android_Firefox.mp4" | "Desktop_Safari.mp4" | "iOS Safari.mp4" | "Desktop_Edge.mp4";
declare function getSysDeniedImage({ osName }: {
    osName: any;
}): string;
export declare const permissionPrompts: {
    audio: {
        ACCEPTED: {
            info: string;
            icon: string;
            text: string;
            steps: () => any[];
            image: () => string;
        };
        SYSTEM_DENIED: {
            info: string;
            icon: string;
            text: string;
            steps: typeof getSysDeniedSteps;
            image: typeof getSysDeniedImage;
        };
        DENIED: {
            info: string;
            icon: string;
            text: string;
            steps: typeof getDeniedSteps;
            image: typeof getDeniedImage;
        };
        COULD_NOT_START: {
            info: string;
            icon: string;
            text: string;
            steps: () => string[];
            image: () => string;
        };
        NOT_REQUESTED: {
            info: string;
            icon: string;
            text: string;
            steps: () => any[];
            image: () => string;
        };
    };
    video: {
        ACCEPTED: {
            info: string;
            icon: string;
            text: string;
            steps: () => any[];
            image: () => string;
        };
        SYSTEM_DENIED: {
            info: string;
            icon: string;
            text: string;
            steps: typeof getSysDeniedSteps;
            image: typeof getSysDeniedImage;
        };
        DENIED: {
            info: string;
            icon: string;
            text: string;
            steps: typeof getDeniedSteps;
            image: typeof getDeniedImage;
        };
        COULD_NOT_START: {
            info: string;
            icon: string;
            text: string;
            steps: () => string[];
            image: () => string;
        };
        NOT_REQUESTED: {
            info: string;
            icon: string;
            text: string;
            steps: () => any[];
            image: () => string;
        };
    };
    screenshare: {
        ACCEPTED: {
            info: string;
            icon: string;
            text: string;
            steps: () => any[];
            image: () => string;
        };
        SYSTEM_DENIED: {
            info: string;
            icon: string;
            text: string;
            steps: typeof getSysDeniedSteps;
            image: typeof getSysDeniedImage;
        };
        DENIED: {
            info: string;
            icon: string;
            text: string;
            steps: typeof getDeniedSteps;
            image: typeof getDeniedImage;
        };
        COULD_NOT_START: {
            info: string;
            icon: string;
            text: string;
            steps: () => string[];
            image: () => string;
        };
        NOT_REQUESTED: {
            info: string;
            icon: string;
            text: string;
            steps: () => any[];
            image: () => string;
        };
    };
};
export declare const issueList: {
    audio: {
        index: number;
        value: string;
        steps: string[];
        troubleshoot: boolean;
    }[];
    video: {
        index: number;
        value: string;
        steps: string[];
        troubleshoot: boolean;
    }[];
    screenshare: {
        index: number;
        value: string;
        steps: string[];
        troubleshoot: boolean;
    }[];
};
export {};
