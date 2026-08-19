/**
 * Thin wrapper around cm-chessboard: keeps the SVG board, markers, arrows and
 * the promotion dialog in one place so the controller only deals with moves.
 */
import { Chessboard, COLOR, INPUT_EVENT_TYPE, BORDER_TYPE, FEN } from 'cm-chessboard'
import { Markers, MARKER_TYPE } from 'cm-chessboard/extensions/markers/Markers.js'
import { Arrows, ARROW_TYPE } from 'cm-chessboard/extensions/arrows/Arrows.js'
import {
  PromotionDialog,
  PROMOTION_DIALOG_RESULT_TYPE,
} from 'cm-chessboard/extensions/promotion-dialog/PromotionDialog.js'

export { MARKER_TYPE, ARROW_TYPE, COLOR }

export class Board {
  /**
   * @param {HTMLElement} element
   * @param {object} handlers
   * @param {(m:{from:string,to:string,promotion?:string}) => boolean} handlers.onMove
   *        Return true if the move was accepted.
   * @param {(from:string,to:string) => boolean} handlers.isPromotion
   * @param {(from:string) => string[]} [handlers.legalTargets]
   */
  constructor(element, handlers = {}) {
    this.handlers = handlers
    this.board = new Chessboard(element, {
      position: FEN.start,
      assetsUrl: '/vendor/cm-chessboard/assets/',
      style: {
        cssClass: 'chess-club',
        borderType: BORDER_TYPE.frame,
        showCoordinates: true,
        animationDuration: 200,
        pieces: { file: new URL('../assets/pieces/design-1.svg', import.meta.url).href },
      },
      extensions: [
        { class: Markers, props: { autoMarkers: MARKER_TYPE.framePrimary } },
        { class: Arrows },
        { class: PromotionDialog },
      ],
    })
    this.inputColour = null
  }

  get orientation() {
    return this.board.getOrientation()
  }

  async setPosition(fen, animated = true) {
    return this.board.setPosition(fen, animated)
  }

  async setOrientation(colour, animated = false) {
    return this.board.setOrientation(colour === 'b' ? COLOR.black : COLOR.white, animated)
  }

  async flip() {
    return this.setOrientation(this.orientation === COLOR.white ? 'b' : 'w', true)
  }

  // cm-chessboard throws "moveInput already enabled" if enableMoveInput is
  // called twice without an intervening disable. Every original caller
  // happened to disable first, so the sharp edge was invisible until a new
  // caller did not. Disabling first makes a repeat enable - including a
  // switch to the other colour - a no-op rather than a crash.
  enableInput(colour) {
    if (this.inputColour !== null) this.board.disableMoveInput()
    this.inputColour = colour
    this.board.enableMoveInput((event) => this._onInput(event), colour === 'b' ? COLOR.black : COLOR.white)
  }

  disableInput() {
    this.inputColour = null
    this.board.disableMoveInput()
  }

  markSquares(squares, type = MARKER_TYPE.square) {
    for (const sq of squares) this.board.addMarker(type, sq)
  }

  markMove(from, to) {
    this.board.addMarker(MARKER_TYPE.frame, from)
    this.board.addMarker(MARKER_TYPE.frame, to)
  }

  arrow(from, to, type = ARROW_TYPE.success) {
    this.board.addArrow(type, from, to)
  }

  clearAnnotations() {
    this.board.removeMarkers()
    this.board.removeArrows()
  }

  destroy() {
    this.board.destroy()
  }

  _onInput(event) {
    if (event.type !== INPUT_EVENT_TYPE.validateMoveInput) return true

    const { squareFrom: from, squareTo: to } = event
    const promoting = this.handlers.isPromotion?.(from, to)

    if (promoting) {
      const colour = this.inputColour === 'b' ? COLOR.black : COLOR.white
      this.board.showPromotionDialog(to, colour, (result) => {
        if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
          this.handlers.onMove?.({ from, to, promotion: result.piece.charAt(1) })
        } else {
          this.handlers.onCancel?.()
        }
      })
      return true
    }

    return Boolean(this.handlers.onMove?.({ from, to }))
  }
}
