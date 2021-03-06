/*---------------------------------------------------------------------------------------------
* Copyright (c) 2018 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import { Point3d } from "../geometry3d/Point3dVector3d";
import { Checker } from "./Checker";
import { expect } from "chai";
import { BezierCurve3d } from "../bspline/BezierCurve3d";
import { Point4d } from "../geometry4d/Point4d";
import { BezierCurve3dH } from "../bspline/BezierCurve3dH";
import { Bezier1dNd } from "../bspline/Bezier1dNd";
import { Point2d } from "../geometry3d/Point2dVector2d";
import { KnotVector } from "../bspline/KnotVector";
import { GeometryCoreTestIO } from "./GeometryCoreTestIO";
import { GeometryQuery } from "../curve/GeometryQuery";

function exercise1dNdBase(ck: Checker, curve: Bezier1dNd) {
  ck.testLE(1, curve.order, "Bezier1dNd has nontrivial order");
  const polygon1 = curve.clonePolygon();
  const polygon2 = curve.clonePolygon(polygon1);
  // confirm the first copy was reused ...
  ck.testTrue(polygon1 === polygon2);

  const pointA = curve.getPolygonPoint(0);
  const pointB = curve.getPolygonPoint(1, pointA);
  ck.testTrue(pointA === pointB, "reuse buffer");
}
/* tslint:disable:no-console */
describe("BsplineCurve", () => {

  it("PoleQueries", () => {
    const ck = new Checker();
    const allPoints: Point3d[] = [
      Point3d.create(0, 0, 0),
      Point3d.create(0, 10, 0),
      Point3d.create(10, 10, 0),
      Point3d.create(10, 0, 0),
      Point3d.create(20, 0, 0),
      Point3d.create(20, 10, 0)];

    ck.testUndefined(BezierCurve3d.create([]));
    const bezierCurves = [BezierCurve3d.create(allPoints)!, BezierCurve3dH.create(allPoints)!];
    ck.testFalse(bezierCurves[0].isAlmostEqual(bezierCurves[1]));
    ck.testFalse(bezierCurves[1].isAlmostEqual(bezierCurves[0]));
    for (const bezier of bezierCurves) {
      ck.testUndefined(bezier.getPolePoint3d(100));
      ck.testUndefined(bezier.getPolePoint4d(100));
      for (let i = 0; i < allPoints.length; i++) {
        const pole3d = bezier.getPolePoint3d(i);
        const pole4d = bezier.getPolePoint4d(i);
        const q = allPoints[i];
        if (ck.testPointer(pole3d) && pole3d) {
          ck.testPoint3d(pole3d, q);
        }
        if (ck.testPointer(pole4d) && pole4d) {
          ck.testPoint4d(pole4d, Point4d.create(q.x, q.y, q.z, 1.0));
        }
      }
    }
    expect(ck.getNumErrors()).equals(0);
  });

  it("Bezier1dNd", () => {
    const ck = new Checker();
    ck.testUndefined(Bezier1dNd.create([]));
    const base2 = Bezier1dNd.create([Point2d.create(1, 2), Point2d.create(2, 2), Point2d.create(3, 1)]);
    const base25 = Bezier1dNd.create([Point2d.create(1, 2), Point2d.create(2, 2), Point2d.create(3, 1), Point2d.create(4, 0), Point2d.create(5, 1)]);
    ck.testFalse(base2!.isAlmostEqual(base25));
    ck.testFalse(base2!.isAlmostEqual(undefined));
    ck.testPointer(base2);
    exercise1dNdBase(ck, base2!);
    const base3 = Bezier1dNd.create([Point3d.create(1, 2), Point3d.create(2, 2), Point3d.create(3, 1)]);
    ck.testPointer(base3);
    exercise1dNdBase(ck, base3!);

    const base4 = Bezier1dNd.create([Point4d.create(1, 2, 0, 1), Point4d.create(2, 20, 1.5), Point4d.create(3, 1, 1, 0.9)]);
    ck.testPointer(base4);
    exercise1dNdBase(ck, base4!);
    ck.testFalse(base2!.isAlmostEqual(base3));
    ck.testFalse(base2!.isAlmostEqual(base4));

    const knotOrder = 5;
    const uniformKnots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const knotVector = KnotVector.create(uniformKnots, knotOrder, false);
    ck.testFalse(base4!.saturateInPlace(knotVector, 100));

    expect(ck.getNumErrors()).equals(0);
  });

  it("SaturateBezier", () => {
    const ck = new Checker();
    const geometry: GeometryQuery[] = [];
    const allPoints: Point3d[] = [
      Point3d.create(0, 0, 0),
      Point3d.create(0, 10, 0),
      Point3d.create(10, 10, 0),
      Point3d.create(10, 0, 0),
      Point3d.create(20, 0, 0),
      Point3d.create(20, 10, 0)];
    const livePoints = [];
    const uniformKnots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const yShift = 20.0;
    let currYShift = 0;
    const xShift1 = 50.0;
    const xShift2 = 100.0;
    for (const p of allPoints) {
      livePoints.push(p);
      if (livePoints.length > 2) {
        const bezier = BezierCurve3d.create(livePoints)!;
        const bezier1 = bezier.clone();
        const knotVector = KnotVector.create(uniformKnots, livePoints.length - 1, false);
        geometry.push(bezier.copyPointsAsLineString());
        geometry[geometry.length - 1].tryTranslateInPlace(0, currYShift, 0);
        bezier.saturateInPlace(knotVector, 0);
        bezier1.saturateInPlace(knotVector, 1);
        // Because the knot vector is uniform, the two saturations are identical.
        ck.testTrue(bezier.isAlmostEqual(bezier1));
        geometry.push(bezier.copyPointsAsLineString());
        geometry[geometry.length - 1].tryTranslateInPlace(0, currYShift, 0);
        const degree = livePoints.length - 1;
        const leftSaturated = [];
        const rightSaturated = [];
        for (let i = 0; i < degree; i++) leftSaturated.push(0);
        for (let i = 0; i < degree; i++) leftSaturated.push(i + 1);

        for (let i = 0; i < degree; i++) rightSaturated.push(i);
        const right = rightSaturated[rightSaturated.length - 1] + 1;
        for (let i = 0; i < degree; i++) rightSaturated.push(right);

        const bezier2 = BezierCurve3d.create(livePoints)!;
        const bezier3 = BezierCurve3d.create(livePoints)!;
        bezier2.saturateInPlace(KnotVector.create(leftSaturated, degree, false), 0);
        bezier3.saturateInPlace(KnotVector.create(rightSaturated, degree, false), 0);
        geometry.push(bezier2.copyPointsAsLineString());
        geometry[geometry.length - 1].tryTranslateInPlace(xShift1, currYShift, 0);
        geometry.push(bezier3.copyPointsAsLineString());
        geometry[geometry.length - 1].tryTranslateInPlace(xShift2, currYShift, 0);

        currYShift += yShift;
      }
    }
    GeometryCoreTestIO.saveGeometry(geometry, "BezierCurve3d", "SingleBezierSaturation");
    expect(ck.getNumErrors()).equals(0);
  });

});
