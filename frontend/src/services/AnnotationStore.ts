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

    getPlayerFocusLines() {
        // I want to return an array of tuples of the form [point1, point2] for each annotation
        return Array.from(this.player_focus_annotations.values()).map(annotation => annotation.points);
    }

}