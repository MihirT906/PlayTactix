import objectHash from "object-hash";

export default class AnnotationStore {
    private player_focus_annotations: Map<string, any> = new Map()
    private draw_annotations: Map<string, any> = new Map()

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

    deletePlayerFocusAnnotation(playerFocusShapes: any) {
        for (const [key, annotation] of this.player_focus_annotations.entries()) {
            const isPresent = playerFocusShapes.some((shape: any) => shape.name === `Player1:${annotation.points[0]},Player2:${annotation.points[1]}`);
            if (!isPresent) {
                this.player_focus_annotations.delete(key);
                console.log('Annotation deleted from store:', key, ":", annotation);
            }
        }
    }

    getPlayerFocusLines() {
        return Array.from(this.player_focus_annotations.values()).map(annotation => annotation.points);
    }

    // addOrDeleteDrawShapes(drawShapes: any){
    //     // Delete draw shapes that do not exist anymore
    //     for (const [key, annotation] of this.draw_annotations.entries()) {
    //         const isPresent = drawShapes.some((shape: any) => objectHash(shape) === key);
    //         if (!isPresent) {
    //             this.draw_annotations.delete(key);
    //             console.log('Draw annotation deleted from store:', key, ":", annotation);
    //         }
    //     }
    //     // Add newly drawn shapes
    //     for (const shape of drawShapes) {
    // }

    handleAnnotationRelayout(eventData: any) {
        console.log('Relayout event data (handleAnnotationRelayout):', eventData)
        const shapes = eventData["shapes"] || [];
        // if (!shapes.length) return;
        const drawShapes = shapes.filter((shape: any) => shape.name == undefined);
        const playerFocusShapes = shapes.filter((shape: any) => !drawShapes.includes(shape));
        this.deletePlayerFocusAnnotation(playerFocusShapes);
        // this.addOrDeleteDrawShapes(drawShapes);
    }

}