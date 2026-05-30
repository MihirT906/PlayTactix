// import objectHash from "object-hash";

// interface PlayerFocusAnnotation {
//     type: string;
//     points: number[];
//     frameStart?: number;
//     frameEnd?: number;
// }


// export default class AnnotationStore {
//     private player_focus_annotations: Map<string, PlayerFocusAnnotation> = new Map()
//     private draw_annotations: Map<string, any> = new Map()

//     displayAllShapes() {
//         console.log('Current Player Focus Annotations:', Array.from(this.player_focus_annotations.values()))
//         console.log('Current Draw Annotations:', Array.from(this.draw_annotations.values()))
//     }

//     addPlayerFocusAnnotation(point1: number, point2: number, currentFrame: number) {
//         const annotation: PlayerFocusAnnotation = {
//             type: 'PlayerFocus',
//             points: [point1, point2],
//         };

//         const uniqueKey = objectHash(annotation);
//         if (this.player_focus_annotations.has(uniqueKey)) return;

//         annotation.frameStart = currentFrame;
//         annotation.frameEnd = undefined;
//         this.player_focus_annotations.set(uniqueKey, annotation);
//         console.log('Annotation added to store:', uniqueKey, ":", annotation);
//     }

//     deletePlayerFocusAnnotation(playerFocusShapes: any, currentFrame: number) {
//         const currentPlayerFocusAnnotations = Array.from(this.player_focus_annotations.values()).filter(annotation => {
//             return annotation.frameStart !== undefined && annotation.frameStart <= currentFrame && (annotation.frameEnd === undefined || annotation.frameEnd > currentFrame);
//         });
//         for (const [key, annotation] of currentPlayerFocusAnnotations.entries()) {
//             const isPresent = playerFocusShapes.some((shape: any) => shape.name === `Player1:${annotation.points[0]},Player2:${annotation.points[1]}`);
//             if (!isPresent) {
//                 annotation.frameEnd = currentFrame;
//                 console.log('Annotation deleted from store:', key, ":", annotation);
//             }
//         }
//     }

//     getPlayerFocusLines(currentFrame: number) {
//         const currentPlayerFocusAnnotations = Array.from(this.player_focus_annotations.values()).filter(annotation => {
//             return annotation.frameStart !== undefined && annotation.frameStart <= currentFrame && (annotation.frameEnd === undefined || annotation.frameEnd > currentFrame);
//         });
//         return currentPlayerFocusAnnotations.map(annotation => annotation.points);
//     }

//     getDrawAnnotations(currentFrame: number) {
//         const currentDrawAnnotations = Array.from(this.draw_annotations.values()).filter((annotation: any) => {
//             return annotation.frameStart !== undefined && annotation.frameStart <= currentFrame && (annotation.frameEnd === undefined || annotation.frameEnd > currentFrame);
//         });
//         return currentDrawAnnotations
//     }

//     addOrDeleteDrawShapes(drawShapes: any, currentFrame: number) {
//         // Delete draw shapes that do not exist anymore
//         const currentDrawAnnotations = new Map(
//             Array.from(this.draw_annotations.entries()).filter(([key, annotation]) => {
//                 return annotation.frameStart !== undefined &&
//                     annotation.frameStart <= currentFrame &&
//                     (annotation.frameEnd === undefined || annotation.frameEnd > currentFrame);
//             })
//         );
//         for (const [key, annotation] of currentDrawAnnotations.entries()) {
//             const isPresent = drawShapes.some((shape: any) => objectHash(shape) === key);
//             if (!isPresent) {
//                 annotation.frameEnd = currentFrame;
//                 console.log('Draw annotation deleted from store:', key, ":", annotation);
//             }
//         }

//         // Add newly drawn shapes
//         for (const shape of drawShapes) {
//             const uniqueKey = objectHash(shape);
//             if (this.draw_annotations.has(uniqueKey)) continue;
//             shape.frameStart = currentFrame;
//             shape.frameEnd = undefined;
//             this.draw_annotations.set(uniqueKey, shape);
//         }
//     }

//     handleAnnotationRelayout(eventData: any, currentFrame: number) {
//         const shapes = eventData["shapes"] || [];
//         const drawShapes = shapes.filter((shape: any) => shape.name == undefined);
//         const playerFocusShapes = shapes.filter((shape: any) => !drawShapes.includes(shape));
//         this.deletePlayerFocusAnnotation(playerFocusShapes, currentFrame);
//         this.addOrDeleteDrawShapes(drawShapes, currentFrame);
//     }

// }