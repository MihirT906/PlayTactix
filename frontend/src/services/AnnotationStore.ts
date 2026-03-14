import objectHash from "object-hash";

export default class AnnotationStore {
    private player_focus_annotations: Map<string, any> = new Map()

    constructor() {
        console.log('AnnotationStore initialized with empty annotations')
    }

    displayPlayerFocusAnnotations() {
        console.log('Current Player Focus Annotations:', Array.from(this.player_focus_annotations.values()))
    }

    addPlayerFocusAnnotation(point1: number, point2: number){
        const annotation = {
            type: 'PlayerFocus',
            points: [point1, point2],
            frameStart: null,
            frameEnd: null,
        }

        const uniqueKey = objectHash(annotation);
        if (this.player_focus_annotations.has(uniqueKey)) return;
        this.player_focus_annotations.set(uniqueKey, annotation);
        console.log('Annotation added to store:', uniqueKey, ":", annotation);
    }

    deletePlayerFocusAnnotation(eventData: any) {
        if (!eventData["shapes"]) return;
        console.log("Current annotations before deletion:", Array.from(this.player_focus_annotations.values()));

        for (const [key, annotation] of this.player_focus_annotations.entries()) {
            const isPresent = eventData["shapes"].some((shape: any) => shape.name === `Player1:${annotation.points[0]},Player2:${annotation.points[1]}`);
            if (!isPresent) {
                this.player_focus_annotations.delete(key);
                console.log('Annotation deleted from store:', key, ":", annotation);
            }
        }
    }

    getPlayerFocusLines() {
        return Array.from(this.player_focus_annotations.values()).map(annotation => annotation.points);
    }

}